declare global {
  namespace Express {
    interface Request {
      user?: import("../../modules/users/user.modal").UserDocument;
    }
  }
}

export {};
