import { listBills, collectPayment, getFinancialSummary } from "../services/billingService.js";

export async function handleListBills(req, res, next) {
  try {
    const { date, status, departmentCode, patientId } = req.query;
    const bills = await listBills({ date, status, departmentCode, patientId });
    res.json({ bills });
  } catch (err) {
    next(err);
  }
}

export async function handleGetBillingSummary(req, res, next) {
  try {
    const { date } = req.query;
    const summary = await getFinancialSummary(date);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function handleCollectPayment(req, res, next) {
  try {
    const { billId } = req.params;
    const { paymentMode } = req.body ?? {};
    const bill = await collectPayment(billId, { paymentMode });
    res.json({ success: true, bill });
  } catch (err) {
    next(err);
  }
}
