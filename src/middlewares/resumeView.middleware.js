const resumeViewMiddleware = (req, res, next) => {
    req.resumeView = req.header("x-resume-view") || req.query.view || null;
    next();
};

export default resumeViewMiddleware;
