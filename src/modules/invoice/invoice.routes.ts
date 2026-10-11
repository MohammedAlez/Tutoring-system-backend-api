
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getInvoiceByIdController, getInvoicesController, updateInvoiceController } from "./invoice.controller";
import { createInvoicePaymentController, getInvoicePaymentsController } from "./invoice-payments/invoice-payment.controller";


export const invoiceRouter = Router();
invoiceRouter.use(authenticate);
invoiceRouter.get("/", getInvoicesController);
invoiceRouter.get("/:id", getInvoiceByIdController);
invoiceRouter.patch("/:id", updateInvoiceController);

// invoice payments routes
invoiceRouter.post("/:id/payments", createInvoicePaymentController);

invoiceRouter.get("/:id/payments", getInvoicePaymentsController);
