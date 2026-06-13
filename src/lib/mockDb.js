// TODO: Reemplazar por Prisma y PlanetScale en entorno Node real.
// Este mock simula llamadas asíncronas a una base de datos relacional.

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = () => Math.random().toString(36).substr(2, 9);

class MockDB {
  constructor() {
    this.data = JSON.parse(localStorage.getItem('ideastik_db')) || {
      users: [],
      businesses: [],
      grids: [],
      posts: [],
      payments: []
    };
  }

  save() {
    localStorage.setItem('ideastik_db', JSON.stringify(this.data));
  }

  async getUser(id) {
    await delay(100);
    return this.data.users.find(u => u.id === id);
  }

  async createUser(email, name) {
    await delay(200);
    const user = {
      id: generateId(),
      email,
      name,
      plan: 'FREE',
      credits: 1, // 1 de regalo inicial
      createdAt: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  async updateUser(id, updates) {
    await delay(100);
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx > -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.save();
      return this.data.users[idx];
    }
    return null;
  }

  async createBusiness(userId, data) {
    await delay(300);
    const biz = {
      id: generateId(),
      userId,
      wizardStep: 0,
      createdAt: new Date().toISOString(),
      ...data
    };
    this.data.businesses.push(biz);
    this.save();
    return biz;
  }

  async getBusiness(id) {
    await delay(100);
    return this.data.businesses.find(b => b.id === id);
  }

  async getUserBusinesses(userId) {
    await delay(100);
    return this.data.businesses.filter(b => b.userId === userId);
  }

  async updateBusiness(id, updates) {
    await delay(200);
    const idx = this.data.businesses.findIndex(b => b.id === id);
    if (idx > -1) {
      this.data.businesses[idx] = { ...this.data.businesses[idx], ...updates };
      this.save();
      return this.data.businesses[idx];
    }
    return null;
  }

  async createGrid(businessId, mes, anio) {
    await delay(200);
    const grid = {
      id: generateId(),
      businessId,
      mes,
      anio,
      ideas: null
    };
    this.data.grids.push(grid);
    this.save();
    return grid;
  }

  async updateGrid(id, updates) {
    await delay(100);
    const idx = this.data.grids.findIndex(g => g.id === id);
    if (idx > -1) {
      this.data.grids[idx] = { ...this.data.grids[idx], ...updates };
      this.save();
      return this.data.grids[idx];
    }
    return null;
  }

  async getGrid(businessId, mes, anio) {
    await delay(100);
    return this.data.grids.find(g => g.businessId === businessId && g.mes === mes && g.anio === anio);
  }

  async createPosts(posts) {
    await delay(300);
    const newPosts = posts.map(p => ({
      ...p,
      id: generateId(),
      status: 'DRAFT',
      creditCharged: false
    }));
    this.data.posts.push(...newPosts);
    this.save();
    return newPosts;
  }

  async getPostsByGrid(gridId) {
    await delay(100);
    return this.data.posts.filter(p => p.gridId === gridId).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }

  async getPost(id) {
    await delay(100);
    return this.data.posts.find(p => p.id === id);
  }

  async updatePost(id, updates) {
    await delay(200);
    const idx = this.data.posts.findIndex(p => p.id === id);
    if (idx > -1) {
      this.data.posts[idx] = { ...this.data.posts[idx], ...updates };
      this.save();
      return this.data.posts[idx];
    }
    return null;
  }
}

export const db = new MockDB();