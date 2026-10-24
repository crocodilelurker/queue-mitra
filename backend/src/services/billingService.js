import Bill from "../models/Bill.js";
import ApiError from "../utils/ApiError.js";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function listBills({ date, status, departmentCode, patientId } = {}) {
  const query = {};
  if (date) query.serviceDate = date;
  if (status) query.paymentStatus = status;
  if (departmentCode) query.departmentCode = departmentCode.toUpperCase();
  if (patientId) query.patientId = patientId;

  return Bill.find(query).sort({ createdAt: -1 }).lean();
}

export async function collectPayment(billId, { paymentMode = "cash" }) {
  const bill = await Bill.findById(billId);
  if (!bill) throw ApiError.notFound("Bill not found");

  bill.paymentStatus = "paid";
  bill.paymentMode = paymentMode;
  bill.paidAt = new Date();
  await bill.save();

  return bill;
}

export async function getFinancialSummary(date = todayDate()) {
  const query = date ? { serviceDate: date } : {};
  const bills = await Bill.find(query).lean();

  let totalBilled = 0;
  let totalCollected = 0;
  let totalWaived = 0;
  let pendingAmount = 0;

  const modeTotals = { cash: 0, upi: 0, card: 0, exemption: 0 };
  const deptTotals = {};

  for (const b of bills) {
    totalBilled += b.fee;

    if (b.paymentStatus === "paid") {
      totalCollected += b.netAmount;
      if (modeTotals[b.paymentMode] !== undefined) {
        modeTotals[b.paymentMode] += b.netAmount;
      }
    } else if (b.paymentStatus === "waived") {
      totalWaived += b.discountOrWaiver || b.fee;
      modeTotals.exemption += b.discountOrWaiver || b.fee;
    } else if (b.paymentStatus === "pending") {
      pendingAmount += b.netAmount;
    }

    deptTotals[b.departmentCode] = (deptTotals[b.departmentCode] || 0) + (b.paymentStatus === "paid" ? b.netAmount : 0);
  }

  return {
    date: date || "all_time",
    totalBillsCount: bills.length,
    totalBilled,
    totalCollected,
    totalWaived,
    pendingAmount,
    collectionByMode: modeTotals,
    collectionByDepartment: deptTotals,
  };
}
