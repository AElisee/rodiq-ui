// Réduit une photo importée (JPEG, max. `maxSize` px de côté) pour la garder en data URL.
// Maquette : en attendant le stockage de fichiers, les photos tiennent dans le localStorage.
export const resizeImage = async (file: File, maxSize = 1000, quality = 0.8) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");
  // Fond clair pour les images transparentes (PNG) converties en JPEG
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
};
