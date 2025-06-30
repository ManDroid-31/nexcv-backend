const clerkHeaderAuth = (req, res, next) => {
    const userId = req.header("x-clerk-user-id");
    // console.log(userId)
    if (!userId) {
        // console.log("missing x-cler")
        return res.status(401).json({ error: "Missing x-clerk-user-id header" });
    }
    req.auth = { userId };
    next();
};

export default clerkHeaderAuth;
