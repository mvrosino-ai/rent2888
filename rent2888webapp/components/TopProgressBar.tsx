// Barra de progreso fina arriba de la pantalla (indeterminada, estilo YouTube).
// Autocontenida: define su propia animación, no depende de globals.css.
export function TopProgressBar() {
  return (
    <>
      <style>{`@keyframes r2sweep{0%{left:-40%;width:40%}50%{left:30%;width:50%}100%{left:100%;width:60%}}`}</style>
      <div
        className="no-print"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 9999,
          background: "rgba(201,168,76,.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            height: "100%",
            background: "#C9A84C",
            animation: "r2sweep 1.2s ease-in-out infinite",
          }}
        />
      </div>
    </>
  );
}
