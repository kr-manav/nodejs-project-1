import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountAvatar,
    updateAccountCoverImg,
    updateAccountDetails,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/changePassword").post(verifyJwt, changeCurrentPassword);
router.route("/getUser").get(verifyJwt, getCurrentUser);
router.route("/updateUser").post(verifyJwt, updateAccountDetails);
router.route("/updateAvatar").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
    ]),
    verifyJwt,
    updateAccountAvatar
);
router.route("/updateCoverImg").post(
    upload.fields([
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    verifyJwt,
    updateAccountCoverImg
);

export default router;
