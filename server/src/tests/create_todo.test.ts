import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput } from '../schema';
import { createTodo } from '../handlers/create_todo';
import { eq } from 'drizzle-orm';

// Test inputs
const basicTodoInput: CreateTodoInput = {
  title: 'Test Todo',
  description: 'A todo for testing'
};

const todoWithNullDescription: CreateTodoInput = {
  title: 'Todo without description',
  description: null
};

const emptyTitleInput = {
  title: '',
  description: 'This should fail'
};

describe('createTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a todo with description', async () => {
    const result = await createTodo(basicTodoInput);

    // Basic field validation
    expect(result.title).toEqual('Test Todo');
    expect(result.description).toEqual('A todo for testing');
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a todo with null description', async () => {
    const result = await createTodo(todoWithNullDescription);

    expect(result.title).toEqual('Todo without description');
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save todo to database', async () => {
    const result = await createTodo(basicTodoInput);

    // Query the database to verify the todo was saved
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toEqual('Test Todo');
    expect(todos[0].description).toEqual('A todo for testing');
    expect(todos[0].completed).toEqual(false);
    expect(todos[0].created_at).toBeInstanceOf(Date);
    expect(todos[0].updated_at).toBeInstanceOf(Date);
  });

  it('should set completed to false by default', async () => {
    const result = await createTodo(basicTodoInput);

    expect(result.completed).toEqual(false);

    // Verify in database as well
    const todo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todo[0].completed).toEqual(false);
  });

  it('should create multiple todos with unique IDs', async () => {
    const todo1 = await createTodo({
      title: 'First Todo',
      description: 'First description'
    });

    const todo2 = await createTodo({
      title: 'Second Todo',
      description: 'Second description'
    });

    expect(todo1.id).not.toEqual(todo2.id);
    expect(todo1.title).toEqual('First Todo');
    expect(todo2.title).toEqual('Second Todo');

    // Verify both are in database
    const allTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(allTodos).toHaveLength(2);
  });

  it('should handle database constraints properly', async () => {
    // This would fail Zod validation before reaching the handler
    // but we can test what happens if empty title somehow gets through
    await expect(createTodo(emptyTitleInput as CreateTodoInput))
      .resolves.toBeDefined(); // The database allows empty strings, Zod should catch this
  });
});