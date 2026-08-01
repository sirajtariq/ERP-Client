export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
};

const SUPER_ADMIN_USER = {
  id: "sa_001",
  name: "Super Admin",
  email: "haseebhk.dev@gmail.com",
  password: "test123456!",
  role: ROLES.SUPER_ADMIN,
  createdAt: "2026-01-01",
  isActive: true,
};

const STORAGE_KEY = "lenden_users";
const SESSION_KEY = "lenden_session";

const getSeedUsers = () => [
  SUPER_ADMIN_USER,
  {
    id: "usr_001",
    name: "Rahul Mehta",
    email: "rahul@example.com",
    password: "admin123",
    role: ROLES.ADMIN,
    createdAt: "2026-03-10",
    isActive: true,
  },
  {
    id: "usr_002",
    name: "Sneha Joshi",
    email: "sneha@example.com",
    password: "admin123",
    role: ROLES.ADMIN,
    createdAt: "2026-04-15",
    isActive: true,
  },
];

export const userDb = {
  _getAll() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const seed = getSeedUsers();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(stored);
  },

  _save(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  },

  getAll() {
    return this._getAll().map(({ password, ...u }) => u);
  },

  authenticate(email, password) {
    const users = this._getAll();
    const user = users.find(
      (u) => u.email === email && u.password === password && u.isActive
    );
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  create(data) {
    const users = this._getAll();
    if (users.find((u) => u.email === data.email)) {
      throw new Error("A user with this email already exists");
    }
    const newUser = {
      ...data,
      id: "usr_" + Date.now(),
      role: data.role || ROLES.ADMIN,
      createdAt: new Date().toISOString().split("T")[0],
      isActive: true,
    };
    users.push(newUser);
    this._save(users);
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  },

  update(id, data) {
    const users = this._getAll();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("User not found");
    if (users[index].id === SUPER_ADMIN_USER.id && data.role && data.role !== ROLES.SUPER_ADMIN) {
      throw new Error("Cannot change Super Admin role");
    }
    users[index] = { ...users[index], ...data };
    this._save(users);
    const { password: _, ...safeUser } = users[index];
    return safeUser;
  },

  delete(id) {
    if (id === SUPER_ADMIN_USER.id) {
      throw new Error("Cannot delete Super Admin");
    }
    const users = this._getAll().filter((u) => u.id !== id);
    this._save(users);
    return true;
  },

  saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  getSession() {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },
};
