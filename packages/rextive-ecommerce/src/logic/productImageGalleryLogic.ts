import { logic, signal } from "rextive";

export const productImageGalleryLogic = logic(
  "productImageGalleryLogic",
  () => {
    const selectedImageIndex = signal(0, {
      name: "productImageGallery.selectedImageIndex",
    });

    const selectImage = (index: number) => {
      selectedImageIndex.set(index);
    };

    return {
      selectImage,
      selectedImageIndex,
    };
  }
);

