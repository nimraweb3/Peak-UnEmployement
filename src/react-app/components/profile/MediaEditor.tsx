import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, apiBase } from "../../lib/api";
import { Button } from "../ui/button";
export function MediaEditor({
  kind,
  path,
}: {
  kind: "avatar" | "banner";
  path?: string | null;
}) {
  const qc = useQueryClient();
  const [source, setSource] = useState(""),
    [x, setX] = useState(50),
    [y, setY] = useState(50),
    [zoom, setZoom] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );
  const url =
    source ||
    (path && supabase
      ? supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl
      : "");
  async function save(remove = false) {
    setBusy(true);
    setError("");
    try {
      if (!supabase) throw new Error("Account service unavailable.");
      let blob: Blob | null = null;
      if (!remove) {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = kind === "avatar" ? 384 : 960;
        canvas.height = kind === "avatar" ? 384 : 320;
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("Image editing isn’t supported in this browser.");
        const scale =
          Math.max(
            canvas.width / image.naturalWidth,
            canvas.height / image.naturalHeight,
          ) * zoom;
        const sw = canvas.width / scale,
          sh = canvas.height / scale;
        context.fillStyle = "#f8f7f2";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          image,
          ((image.naturalWidth - sw) * x) / 100,
          ((image.naturalHeight - sh) * y) / 100,
          sw,
          sh,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/jpeg", 0.8),
        );
        if (!blob || blob.size > 524288)
          throw new Error("Image is too large. Try a simpler crop.");
      }
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error("Sign in again to upload.");
      const response = await fetch(apiBase + "/api/me/media/" + kind, {
        method: remove ? "DELETE" : "POST",
        headers: {
          Authorization: "Bearer " + session.data.session.access_token,
          ...(!remove ? { "Content-Type": "image/jpeg" } : {}),
        },
        body: blob,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setSource("");
      await qc.invalidateQueries({ queryKey: ["profile-details"] });
      await qc.invalidateQueries({ queryKey: ["public-profile"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={"media-editor media-" + kind}>
      <h3>{kind === "avatar" ? "Profile picture" : "Profile banner"}</h3>
      <div
        className="media-preview"
        style={{
          aspectRatio: kind === "avatar" ? "1" : "3",
          maxWidth: kind === "avatar" ? 192 : 480,
          overflow: "hidden",
        }}
      >
        {url && (
          <img
            src={url}
            alt={kind + " preview"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${x}% ${y}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${x}% ${y}%`,
            }}
          />
        )}
      </div>
      <label>
        Choose {kind}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 8 * 1024 * 1024
            ) {
              setError("Choose a JPEG, PNG or WebP under 8 MB.");
              return;
            }
            const header = new Uint8Array(
              await file.slice(0, 12).arrayBuffer(),
            );
            const matches =
              file.type === "image/jpeg"
                ? header[0] === 255 && header[1] === 216
                : file.type === "image/png"
                  ? [137, 80, 78, 71, 13, 10, 26, 10].every(
                      (byte, i) => header[i] === byte,
                    )
                  : String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
                    String.fromCharCode(...header.slice(8, 12)) === "WEBP";
            if (!matches) {
              setError("The file contents don’t match a supported image type.");
              return;
            }
            const u = URL.createObjectURL(file);
            try {
              const img = new Image();
              img.src = u;
              await img.decode();
              if (
                img.naturalWidth * img.naturalHeight > 16000000 ||
                Math.min(img.naturalWidth, img.naturalHeight) < 32
              )
                throw new Error();
              setSource(u);
              setX(50);
              setY(50);
              setZoom(1);
            } catch {
              URL.revokeObjectURL(u);
              setError(
                "Choose a valid image between 32 pixels and 16 megapixels.",
              );
            }
          }}
        />
      </label>
      {source && (
        <>
          <label>
            Horizontal position
            <input
              type="range"
              min="0"
              max="100"
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
            />
          </label>
          <label>
            Vertical position
            <input
              type="range"
              min="0"
              max="100"
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
            />
          </label>
          <label>
            Zoom
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <Button disabled={busy} onClick={() => void save()}>
            Save {kind}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setSource("")}>
            Cancel
          </Button>
        </>
      )}
      {path && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void save(true)}
        >
          Remove {kind}
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
