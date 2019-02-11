import { Request, Response, RequestHandler } from "express";

type Accept = (req: Request, res: Response) => void | false | Tamperer;
type Tamperer = (body: string) => string | Promise<string>;

export = (accept: Accept) => RequestHandler;