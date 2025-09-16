import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type GetTodoInput } from '../schema';
import { getTodo } from '../handlers/get_todo';

describe('getTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a todo when it exists', async () => {
    // First, create a todo to fetch
    const todoData = {
      title: 'Test Todo',
      description: 'A todo for testing',
      completed: false
    };

    const insertResult = await db.insert(todosTable)
      .values(todoData)
      .returning()
      .execute();

    const createdTodo = insertResult[0];

    // Now test fetching it
    const input: GetTodoInput = {
      id: createdTodo.id
    };

    const result = await getTodo(input);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTodo.id);
    expect(result!.title).toEqual('Test Todo');
    expect(result!.description).toEqual('A todo for testing');
    expect(result!.completed).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when todo does not exist', async () => {
    const input: GetTodoInput = {
      id: 999 // Non-existent ID
    };

    const result = await getTodo(input);

    expect(result).toBeNull();
  });

  it('should handle todos with null description correctly', async () => {
    // Create a todo with null description
    const todoData = {
      title: 'Todo with no description',
      description: null,
      completed: true
    };

    const insertResult = await db.insert(todosTable)
      .values(todoData)
      .returning()
      .execute();

    const createdTodo = insertResult[0];

    const input: GetTodoInput = {
      id: createdTodo.id
    };

    const result = await getTodo(input);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Todo with no description');
    expect(result!.description).toBeNull();
    expect(result!.completed).toEqual(true);
  });

  it('should return the correct todo when multiple todos exist', async () => {
    // Create multiple todos
    const todo1Data = {
      title: 'First Todo',
      description: 'First description',
      completed: false
    };

    const todo2Data = {
      title: 'Second Todo', 
      description: 'Second description',
      completed: true
    };

    const insertResult1 = await db.insert(todosTable)
      .values(todo1Data)
      .returning()
      .execute();

    const insertResult2 = await db.insert(todosTable)
      .values(todo2Data)
      .returning()
      .execute();

    const createdTodo1 = insertResult1[0];
    const createdTodo2 = insertResult2[0];

    // Fetch the second todo
    const input: GetTodoInput = {
      id: createdTodo2.id
    };

    const result = await getTodo(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdTodo2.id);
    expect(result!.title).toEqual('Second Todo');
    expect(result!.description).toEqual('Second description');
    expect(result!.completed).toEqual(true);

    // Verify we didn't get the first todo
    expect(result!.id).not.toEqual(createdTodo1.id);
    expect(result!.title).not.toEqual('First Todo');
  });

  it('should verify database isolation between tests', async () => {
    // This test should run with a clean database
    const input: GetTodoInput = {
      id: 1 // Any ID should not exist in fresh DB
    };

    const result = await getTodo(input);

    expect(result).toBeNull();
  });
});