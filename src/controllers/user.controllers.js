import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
export const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;
    // if(fullname == "" ){
    //     throw new ApiError(400, "FullName is required");
    // }

    if (
        [fullname, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existingUser) {
        throw new ApiError(400, "user with same username or email exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImgLocalPath = req.files.coverImage ? req.files?.coverImage[0]?.path : "";

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const uploadedAvatarImg = await uploadOnCloudinary(avatarLocalPath);
    const uploadedCoverImg = coverImgLocalPath
        ? await uploadOnCloudinary(coverImgLocalPath)
        : "";

    const user = await User.create({
        fullname,
        avatar: uploadedAvatarImg,
        coverImage: uploadedCoverImg,
        email: email.toLowerCase(),
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while register");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "user registered successfully")
        );
});
