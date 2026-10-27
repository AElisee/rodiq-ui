// Taille maximale d'une photo acceptée par l'API, une fois décodée
export const MAX_PHOTO_BYTES = 600 * 1024;

// Octets d'une data URL base64 une fois décodée
const dataUrlBytes = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

// Réduit une photo importée en JPEG (max. `maxSize` px de côté) avant son envoi à l'API, en baissant la
// qualité jusqu'à passer sous la limite du serveur
export const resizeImage = async (file: File, maxSize = 1000, quality = 0.8) => {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("le navigateur ne sait pas lire cette image (fichier abîmé ou format non pris en charge)");
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("le navigateur ne permet pas de redimensionner l'image");
  // Fond clair pour les images transparentes (PNG) converties en JPEG
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (let q = quality; q >= 0.4; q -= 0.1) {
    const dataUrl = canvas.toDataURL("image/jpeg", q);
    if (dataUrlBytes(dataUrl) <= MAX_PHOTO_BYTES) return dataUrl;
  }
  throw new Error(`l'image dépasse ${MAX_PHOTO_BYTES / 1024} Ko même compressée`);
};
