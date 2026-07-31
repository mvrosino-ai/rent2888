import { ImageResponse } from "next/og";

// Favicon generado dinámicamente con la identidad Rent2888:
// fondo navy, monograma "R" en serif y un punto rojo de acento (como el "2888").
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#22284f",
          borderRadius: 7,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "Georgia, 'Times New Roman', serif",
            lineHeight: 1,
          }}
        >
          R
        </div>
        <div
          style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: "#e54040",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
