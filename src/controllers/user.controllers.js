import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {
            refreshToken,
            accessToken,
        };
    } catch (error) {
        throw new ApiError(
            500,
            "something went wrong while generating access and refresh tokens"
        );
    }
};

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
    const coverImgLocalPath = req.files.coverImage
        ? req.files?.coverImage[0]?.path
        : "";

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

export const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Please enter username or email");
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!existingUser) {
        throw new ApiError(400, "user does not exists");
    }

    const isCorrectPassword = existingUser.isCorrectPassword(password);

    if (!isCorrectPassword) {
        throw new ApiError(400, "incorrect password");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
        existingUser._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                {
                    ...existingUser,
                    accessToken,
                    refreshToken,
                },
                "user registered successfully"
            )
        );
});

export const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});
