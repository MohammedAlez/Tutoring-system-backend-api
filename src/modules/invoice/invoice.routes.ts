
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getInvoiceByIdController, getInvoicesController, updateInvoiceController } from "./invoice.controller";

export const invoiceRouter = Router();
invoiceRouter.use(authenticate);
invoiceRouter.get("/", getInvoicesController);
invoiceRouter.get("/:id", getInvoiceByIdController);
invoiceRouter.patch("/:id", updateInvoiceController);