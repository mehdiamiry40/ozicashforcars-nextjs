import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ozi Cash for Cars",
    short_name: "Ozi Cash",
    description: "Vehicle quotes and free car removal in greater Brisbane.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1110",
    theme_color: "#e9b949",
    icons: [
      { src: "/wp-content/uploads/2019/07/cropped-favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/wp-content/uploads/2019/07/cropped-favicon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
