import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.ClOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;
    // Upload an image
    const uploadResult = await cloudinary.uploader
        .upload(localFilePath, {
            resource_type: "auto",
        })
        .catch((error) => {
            console.log("File uploading failed: ", error);
            fs.unlinkSync(localFilePath);
            return null;
        });

    console.log("File has been uploaded to url:", uploadResult.url);
    return uploadResult.url;
};
