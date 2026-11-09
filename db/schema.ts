import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const revisions = sqliteTable('revisions', {version:integer('version').primaryKey(),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull(),author:text('author').notNull()});
