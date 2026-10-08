/**
 * Cut the chosen square out of a photo and shrink it for a profile picture.
 *
 * A profile picture is shown at most a few hundred pixels across, so the
 * crop is saved at no more than MAX_SIDE — a photo straight off a phone
 * camera would otherwise be several megabytes, over the server's 5 MB limit.
 */
export const MAX_SIDE = 512;
export const UNREADABLE = 'That photo could not be read. Try another one.';

/** @returns {Promise<Blob>} a JPEG of the crop, at most MAX_SIDE across */
export const getCroppedBlob = (imageSrc, pixelCrop) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = () => reject(new Error(UNREADABLE));
        image.onload = () => {
            const scale = Math.min(1, MAX_SIDE / Math.max(pixelCrop.width, pixelCrop.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(pixelCrop.width * scale);
            canvas.height = Math.round(pixelCrop.height * scale);
            const ctx = canvas.getContext('2d');
            // A transparent PNG would turn black as a JPEG: paint white under it.
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(UNREADABLE))), 'image/jpeg', 0.9);
        };
        image.src = imageSrc;
    });
