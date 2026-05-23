// Mock in-memory database for development
class MockDatabase {
  constructor() {
    this.tables = {
      users: [],
      projects: [],
      project_members: [],
      tasks: [],
      task_comments: [],
      attendance: [],
    };
    this.idCounters = {
      users: 1,
      projects: 1,
      project_members: 1,
      tasks: 1,
      task_comments: 1,
      attendance: 1,
    };
  }

  async query(sql, params = []) {
    // Return mock responses based on SQL
    // This is a simplified version that handles basic SELECT, INSERT, UPDATE, DELETE
    
    if (sql.includes('CREATE TABLE')) {
      return { rows: [], rowCount: 0, fields: [] };
    }
    
    if (sql.includes('SELECT 1')) {
      return { rows: [{ '?column?': 1 }], rowCount: 1, fields: [] };
    }

    // Default response
    return { rows: [], rowCount: 0, fields: [] };
  }

  async connect() {
    return {
      query: (sql, params) => this.query(sql, params),
      release: () => {},
    };
  }

  async end() {
    // Cleanup
  }

  on(event, callback) {
    // Mock event listener
  }
}

module.exports = MockDatabase;
