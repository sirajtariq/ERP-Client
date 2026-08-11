export const MOCK_EMPLOYEES = [
  {
    id: 1, empNo: "EMP-001",
    name: "Ahmad Raza",
    designation: "Store Manager",
    department: "Operations",
    joiningDate: "2022-01-15",
    basicSalary: 35000,
    currentSalary: 45000,
    phone: "0301-1234567",
    email: "ahmad.raza@motormark.com",
    cnic: "35202-1234567-1",
    address: "House 12, Street 5, Model Town, Lahore",
    status: "active", leavingDate: null, reJoiningDate: null,
  },
  {
    id: 2, empNo: "EMP-002",
    name: "Sara Khan",
    designation: "Accountant",
    department: "Finance",
    joiningDate: "2021-06-01",
    basicSalary: 30000,
    currentSalary: 38000,
    phone: "0302-7654321",
    email: "sara.khan@motormark.com",
    cnic: "35202-7654321-2",
    address: "Apartment 3B, Gulberg, Lahore",
    status: "active", leavingDate: null, reJoiningDate: null,
  },
  {
    id: 3, empNo: "EMP-003",
    name: "Usman Ali",
    designation: "Sales Executive",
    department: "Sales",
    joiningDate: "2023-03-20",
    basicSalary: 25000,
    currentSalary: 28000,
    phone: "0333-9876543",
    email: "usman.ali@motormark.com",
    cnic: "35202-9876543-3",
    address: "House 45, DHA Phase 4, Lahore",
    status: "active", leavingDate: null, reJoiningDate: null,
  },
  {
    id: 4, empNo: "EMP-004",
    name: "Fatima Malik",
    designation: "HR Manager",
    department: "Human Resources",
    joiningDate: "2020-08-10",
    basicSalary: 40000,
    currentSalary: 55000,
    phone: "0321-5551234",
    email: "fatima.malik@motormark.com",
    cnic: "35202-5551234-4",
    address: "House 8, Johar Town, Lahore",
    status: "active", leavingDate: null, reJoiningDate: null,
  },
  {
    id: 5, empNo: "EMP-005",
    name: "Bilal Hassan",
    designation: "Driver",
    department: "Logistics",
    joiningDate: "2022-11-01",
    basicSalary: 20000,
    currentSalary: 22000,
    phone: "0345-6789012",
    email: "",
    cnic: "35202-6789012-5",
    address: "House 78, Sanda Road, Lahore",
    status: "inactive",
    leavingDate: "2026-07-31",
    reJoiningDate: null,
  },
];

// Each record represents one month's salary calculation.
// `amountPaid` tracks total paid so far (may be < netSalary for partial).
// `payments` holds individual payment installments.
// status: "pending" | "partial" | "paid"
export const MOCK_SALARY_RECORDS = [
  {
    id: 1, employeeId: 1, month: 7, year: 2026,
    basicSalary: 45000, bonus: 0, deductions: 0, advanceDeduction: 5000, netSalary: 40000,
    amountPaid: 20000, status: "partial",
    payments: [
      { id: 101, date: "2026-07-15", amount: 20000, method: "Cash",          paidBy: "Admin", remarks: "First half" },
    ],
  },
  {
    id: 2, employeeId: 1, month: 6, year: 2026,
    basicSalary: 45000, bonus: 5000, deductions: 0, advanceDeduction: 0, netSalary: 50000,
    amountPaid: 50000, status: "paid",
    payments: [
      { id: 102, date: "2026-06-30", amount: 50000, method: "Bank Transfer", paidBy: "Admin", remarks: "Eid bonus" },
    ],
  },
  {
    id: 3, employeeId: 1, month: 5, year: 2026,
    basicSalary: 45000, bonus: 0, deductions: 1000, advanceDeduction: 5000, netSalary: 39000,
    amountPaid: 39000, status: "paid",
    payments: [
      { id: 103, date: "2026-05-31", amount: 39000, method: "Cash",          paidBy: "Admin", remarks: "Late attendance deduction" },
    ],
  },
  {
    id: 4, employeeId: 1, month: 4, year: 2026,
    basicSalary: 45000, bonus: 0, deductions: 0, advanceDeduction: 0, netSalary: 45000,
    amountPaid: 45000, status: "paid",
    payments: [
      { id: 104, date: "2026-04-30", amount: 45000, method: "Bank Transfer", paidBy: "Admin", remarks: "" },
    ],
  },
  {
    id: 5, employeeId: 2, month: 7, year: 2026,
    basicSalary: 38000, bonus: 0, deductions: 0, advanceDeduction: 0, netSalary: 38000,
    amountPaid: 38000, status: "paid",
    payments: [
      { id: 105, date: "2026-07-31", amount: 38000, method: "Bank Transfer", paidBy: "Admin", remarks: "" },
    ],
  },
  {
    id: 6, employeeId: 2, month: 6, year: 2026,
    basicSalary: 38000, bonus: 5000, deductions: 0, advanceDeduction: 0, netSalary: 43000,
    amountPaid: 43000, status: "paid",
    payments: [
      { id: 106, date: "2026-06-30", amount: 43000, method: "Bank Transfer", paidBy: "Admin", remarks: "Eid bonus" },
    ],
  },
  {
    id: 7, employeeId: 3, month: 7, year: 2026,
    basicSalary: 28000, bonus: 0, deductions: 0, advanceDeduction: 5000, netSalary: 23000,
    amountPaid: 23000, status: "paid",
    payments: [
      { id: 107, date: "2026-07-31", amount: 23000, method: "Cash",          paidBy: "Admin", remarks: "" },
    ],
  },
  {
    id: 8, employeeId: 3, month: 6, year: 2026,
    basicSalary: 28000, bonus: 2000, deductions: 0, advanceDeduction: 5000, netSalary: 25000,
    amountPaid: 25000, status: "paid",
    payments: [
      { id: 108, date: "2026-06-30", amount: 25000, method: "Cash",          paidBy: "Admin", remarks: "Performance bonus" },
    ],
  },
  {
    id: 9, employeeId: 4, month: 7, year: 2026,
    basicSalary: 55000, bonus: 0, deductions: 0, advanceDeduction: 0, netSalary: 55000,
    amountPaid: 55000, status: "paid",
    payments: [
      { id: 109, date: "2026-07-31", amount: 55000, method: "Bank Transfer", paidBy: "Admin", remarks: "" },
    ],
  },
  {
    id: 10, employeeId: 4, month: 6, year: 2026,
    basicSalary: 55000, bonus: 10000, deductions: 0, advanceDeduction: 0, netSalary: 65000,
    amountPaid: 65000, status: "paid",
    payments: [
      { id: 110, date: "2026-06-30", amount: 65000, method: "Bank Transfer", paidBy: "Admin", remarks: "Eid bonus" },
    ],
  },
  {
    id: 11, employeeId: 5, month: 6, year: 2026,
    basicSalary: 22000, bonus: 0, deductions: 0, advanceDeduction: 0, netSalary: 22000,
    amountPaid: 22000, status: "paid",
    payments: [
      { id: 111, date: "2026-06-30", amount: 22000, method: "Cash",          paidBy: "Admin", remarks: "" },
    ],
  },
];

export const MOCK_INCREMENTS = [
  { id: 1, employeeId: 1, effectiveDate: "2023-01-01", previousSalary: 35000, incrementAmount: 4000, newSalary: 39000, reason: "Annual Performance Review", approvedBy: "Director" },
  { id: 2, employeeId: 1, effectiveDate: "2025-01-01", previousSalary: 39000, incrementAmount: 3000, newSalary: 42000, reason: "Annual Performance Review", approvedBy: "Director" },
  { id: 3, employeeId: 1, effectiveDate: "2026-01-01", previousSalary: 42000, incrementAmount: 3000, newSalary: 45000, reason: "Promotion to Store Manager", approvedBy: "Director" },
  { id: 4, employeeId: 2, effectiveDate: "2022-06-01", previousSalary: 30000, incrementAmount: 5000, newSalary: 35000, reason: "Performance Increment", approvedBy: "HR Manager" },
  { id: 5, employeeId: 2, effectiveDate: "2024-01-01", previousSalary: 35000, incrementAmount: 3000, newSalary: 38000, reason: "Annual Increment", approvedBy: "HR Manager" },
  { id: 6, employeeId: 3, effectiveDate: "2024-03-20", previousSalary: 25000, incrementAmount: 3000, newSalary: 28000, reason: "1 Year Service Increment", approvedBy: "Sales Manager" },
  { id: 7, employeeId: 4, effectiveDate: "2021-08-10", previousSalary: 40000, incrementAmount: 5000, newSalary: 45000, reason: "Annual Increment", approvedBy: "Director" },
  { id: 8, employeeId: 4, effectiveDate: "2023-01-01", previousSalary: 45000, incrementAmount: 5000, newSalary: 50000, reason: "Performance Review", approvedBy: "Director" },
  { id: 9, employeeId: 4, effectiveDate: "2025-01-01", previousSalary: 50000, incrementAmount: 5000, newSalary: 55000, reason: "Annual Increment", approvedBy: "Director" },
  { id: 10, employeeId: 5, effectiveDate: "2023-11-01", previousSalary: 20000, incrementAmount: 2000, newSalary: 22000, reason: "Annual Increment", approvedBy: "Manager" },
];

export const MOCK_ADVANCES = [
  { id: 1, employeeId: 1, date: "2026-06-10", amount: 10000, reason: "Medical Emergency",  paymentMethod: "Cash",          deductedAmount: 10000, status: "recovered" },
  { id: 2, employeeId: 1, date: "2026-07-05", amount: 5000,  reason: "Personal Need",     paymentMethod: "Cash",          deductedAmount: 0,     status: "pending" },
  { id: 3, employeeId: 3, date: "2026-04-15", amount: 20000, reason: "Home Renovation",   paymentMethod: "Bank Transfer", deductedAmount: 10000, status: "partial" },
  { id: 4, employeeId: 5, date: "2026-05-20", amount: 8000,  reason: "Personal Need",     paymentMethod: "Cash",          deductedAmount: 0,     status: "pending" },
];
