type CinematicAppBackdropProps = {
  variant?: "immersive" | "workspace";
};

const sparkIndexes = Array.from({ length: 18 }, (_, index) => index);

export function CinematicAppBackdrop({ variant = "immersive" }: CinematicAppBackdropProps) {
  return (
    <div className={`cinematic-app-backdrop cinematic-app-backdrop--${variant}`} aria-hidden>
      <div className="cinematic-app-backdrop__field" />
      <div className="cinematic-app-backdrop__mesh" />
      <div className="cinematic-app-backdrop__halo cinematic-app-backdrop__halo--warm" />
      <div className="cinematic-app-backdrop__halo cinematic-app-backdrop__halo--cool" />
      <div className="cinematic-app-backdrop__orbit cinematic-app-backdrop__orbit--outer" />
      <div className="cinematic-app-backdrop__orbit cinematic-app-backdrop__orbit--inner" />
      <div className="cinematic-app-backdrop__sparks">
        {sparkIndexes.map((index) => (
          <span key={index} />
        ))}
      </div>
      <div className="cinematic-app-backdrop__scan" />
      <div className="cinematic-app-backdrop__grain" />
      <div className="cinematic-app-backdrop__vignette" />
    </div>
  );
}
