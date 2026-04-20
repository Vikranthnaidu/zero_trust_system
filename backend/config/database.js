// config/database.js
// Sequelize database connection configuration

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,        // Maximum number of connections
      min: 0,         // Minimum number of connections
      acquire: 30000, // Max time (ms) to acquire connection
      idle: 10000     // Time (ms) before idle connection is released
    },
    define: {
      timestamps: true,      // Add createdAt/updatedAt to all models
      underscored: false,    // Use camelCase column names
      freezeTableName: false // Pluralize table names
    }
  }
);

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };