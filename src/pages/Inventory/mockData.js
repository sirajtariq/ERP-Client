export const MOCK_ITEMS = [
  {
    id: 1, itemCode: "ITM-001",
    name: "Engine Oil 20W-50 (1L)",
    category: "Lubricants",
    unit: "liter",
    purchaseRate: 850,
    saleRate: 1100,
    currentStock: 120,
    minStock: 30,
    description: "High performance engine oil for petrol & diesel engines",
  },
  {
    id: 2, itemCode: "ITM-002",
    name: "Air Filter – Toyota Corolla",
    category: "Filters",
    unit: "pcs",
    purchaseRate: 450,
    saleRate: 650,
    currentStock: 8,
    minStock: 10,
    description: "OEM compatible air filter for Toyota Corolla 2014-2022",
  },
  {
    id: 3, itemCode: "ITM-003",
    name: "Brake Pads – Front (Set)",
    category: "Brakes",
    unit: "set",
    purchaseRate: 1800,
    saleRate: 2600,
    currentStock: 0,
    minStock: 5,
    description: "Heavy duty front brake pads, fits most Japanese cars",
  },
  {
    id: 4, itemCode: "ITM-004",
    name: "Spark Plug (NGK)",
    category: "Electrical",
    unit: "pcs",
    purchaseRate: 280,
    saleRate: 420,
    currentStock: 55,
    minStock: 20,
    description: "NGK original spark plug, universal fit",
  },
  {
    id: 5, itemCode: "ITM-005",
    name: "Car Battery – 65Ah",
    category: "Electrical",
    unit: "pcs",
    purchaseRate: 12500,
    saleRate: 16000,
    currentStock: 6,
    minStock: 4,
    description: "Maintenance free dry battery, 12V 65Ah",
  },
  {
    id: 6, itemCode: "ITM-006",
    name: "Radiator Coolant (5L)",
    category: "Lubricants",
    unit: "can",
    purchaseRate: 1200,
    saleRate: 1700,
    currentStock: 35,
    minStock: 10,
    description: "Long life coolant, ready to use, green formula",
  },
  {
    id: 7, itemCode: "ITM-007",
    name: "Wiper Blade – 16 inch",
    category: "Accessories",
    unit: "pcs",
    purchaseRate: 350,
    saleRate: 550,
    currentStock: 3,
    minStock: 8,
    description: "All-season wiper blade, frameless design",
  },
  {
    id: 8, itemCode: "ITM-008",
    name: "Oil Filter – Honda Civic",
    category: "Filters",
    unit: "pcs",
    purchaseRate: 320,
    saleRate: 480,
    currentStock: 22,
    minStock: 10,
    description: "Genuine grade oil filter for Honda Civic 2016-2022",
  },
  {
    id: 9, itemCode: "ITM-009",
    name: "Steering Wheel Cover",
    category: "Accessories",
    unit: "pcs",
    purchaseRate: 180,
    saleRate: 300,
    currentStock: 40,
    minStock: 15,
    description: "Universal fit, anti-slip leather texture",
  },
  {
    id: 10, itemCode: "ITM-010",
    name: "Timing Belt Kit",
    category: "Engine Parts",
    unit: "set",
    purchaseRate: 3200,
    saleRate: 4800,
    currentStock: 0,
    minStock: 3,
    description: "Complete timing belt kit with tensioner and idler",
  },
];

export const MOCK_STOCK_HISTORY = [
  // ITM-001
  { id: 1,  itemId: 1, type: "in",  qty: 150, reason: "Opening Stock",   date: "2026-01-01", notes: "Initial inventory setup", stockBefore: 0,   stockAfter: 150 },
  { id: 2,  itemId: 1, type: "out", qty: 30,  reason: "Sale",            date: "2026-02-10", notes: "",                        stockBefore: 150, stockAfter: 120 },
  // ITM-002
  { id: 3,  itemId: 2, type: "in",  qty: 20,  reason: "Purchase",        date: "2026-01-15", notes: "Purchased from Al-Hamid Motors", stockBefore: 0, stockAfter: 20 },
  { id: 4,  itemId: 2, type: "out", qty: 12,  reason: "Sale",            date: "2026-03-01", notes: "",                        stockBefore: 20,  stockAfter: 8  },
  // ITM-003
  { id: 5,  itemId: 3, type: "in",  qty: 10,  reason: "Purchase",        date: "2026-01-20", notes: "",                        stockBefore: 0,   stockAfter: 10 },
  { id: 6,  itemId: 3, type: "out", qty: 10,  reason: "Sale",            date: "2026-04-05", notes: "Bulk sale to workshop",   stockBefore: 10,  stockAfter: 0  },
  // ITM-004
  { id: 7,  itemId: 4, type: "in",  qty: 80,  reason: "Opening Stock",   date: "2026-01-01", notes: "",                        stockBefore: 0,   stockAfter: 80 },
  { id: 8,  itemId: 4, type: "out", qty: 25,  reason: "Sale",            date: "2026-02-20", notes: "",                        stockBefore: 80,  stockAfter: 55 },
  // ITM-005
  { id: 9,  itemId: 5, type: "in",  qty: 10,  reason: "Purchase",        date: "2026-02-01", notes: "Exide batteries",         stockBefore: 0,   stockAfter: 10 },
  { id: 10, itemId: 5, type: "out", qty: 4,   reason: "Sale",            date: "2026-03-15", notes: "",                        stockBefore: 10,  stockAfter: 6  },
  // ITM-006
  { id: 11, itemId: 6, type: "in",  qty: 50,  reason: "Purchase",        date: "2026-01-10", notes: "",                        stockBefore: 0,   stockAfter: 50 },
  { id: 12, itemId: 6, type: "out", qty: 15,  reason: "Sale",            date: "2026-03-20", notes: "",                        stockBefore: 50,  stockAfter: 35 },
  // ITM-007
  { id: 13, itemId: 7, type: "in",  qty: 15,  reason: "Purchase",        date: "2026-01-25", notes: "",                        stockBefore: 0,   stockAfter: 15 },
  { id: 14, itemId: 7, type: "out", qty: 10,  reason: "Sale",            date: "2026-02-28", notes: "",                        stockBefore: 15,  stockAfter: 5  },
  { id: 15, itemId: 7, type: "out", qty: 2,   reason: "Damaged",         date: "2026-03-10", notes: "Damaged in storage",      stockBefore: 5,   stockAfter: 3  },
  // ITM-008
  { id: 16, itemId: 8, type: "in",  qty: 30,  reason: "Opening Stock",   date: "2026-01-01", notes: "",                        stockBefore: 0,   stockAfter: 30 },
  { id: 17, itemId: 8, type: "out", qty: 8,   reason: "Sale",            date: "2026-03-05", notes: "",                        stockBefore: 30,  stockAfter: 22 },
  // ITM-009
  { id: 18, itemId: 9, type: "in",  qty: 60,  reason: "Purchase",        date: "2026-02-05", notes: "",                        stockBefore: 0,   stockAfter: 60 },
  { id: 19, itemId: 9, type: "out", qty: 20,  reason: "Sale",            date: "2026-03-25", notes: "",                        stockBefore: 60,  stockAfter: 40 },
  // ITM-010
  { id: 20, itemId: 10, type: "in", qty: 5,   reason: "Purchase",        date: "2026-02-10", notes: "",                        stockBefore: 0,   stockAfter: 5  },
  { id: 21, itemId: 10, type: "out",qty: 5,   reason: "Sale",            date: "2026-04-10", notes: "Sold to Ahmed Auto Works",stockBefore: 5,   stockAfter: 0  },
];

export const CATEGORIES = [
  "Lubricants", "Filters", "Brakes", "Electrical", "Engine Parts",
  "Accessories", "Tyres", "Suspension", "Body Parts", "Other",
];

export const UNITS = [
  { value: "pcs",   label: "Pieces (pcs)" },
  { value: "set",   label: "Set" },
  { value: "liter", label: "Liter" },
  { value: "kg",    label: "Kilogram (kg)" },
  { value: "gram",  label: "Gram (g)" },
  { value: "meter", label: "Meter (m)" },
  { value: "dozen", label: "Dozen" },
  { value: "box",   label: "Box" },
  { value: "pack",  label: "Pack" },
  { value: "can",   label: "Can" },
  { value: "pair",  label: "Pair" },
];

export const STOCK_IN_REASONS  = ["Purchase", "Sale Return", "Opening Stock", "Stock Transfer In", "Correction"];
export const STOCK_OUT_REASONS = ["Sale", "Damaged / Expired", "Stock Transfer Out", "Sample / Testing", "Correction"];
