import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no todos exist', async () => {
    const result = await getTodos();

    expect(result).toEqual([]);
  });

  it('should return all todos', async () => {
    // Create test todos
    await db.insert(todosTable)
      .values([
        {
          title: 'First Todo',
          description: 'First description',
          completed: false
        },
        {
          title: 'Second Todo',
          description: 'Second description',
          completed: true
        },
        {
          title: 'Third Todo',
          description: null, // Test nullable description
          completed: false
        }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    
    // Verify all todos have required fields
    result.forEach(todo => {
      expect(todo.id).toBeDefined();
      expect(typeof todo.title).toBe('string');
      expect(typeof todo.completed).toBe('boolean');
      expect(todo.created_at).toBeInstanceOf(Date);
      expect(todo.updated_at).toBeInstanceOf(Date);
      // description can be string or null
      expect(todo.description === null || typeof todo.description === 'string').toBe(true);
    });

    // Verify specific todo content
    const titles = result.map(todo => todo.title);
    expect(titles).toContain('First Todo');
    expect(titles).toContain('Second Todo');
    expect(titles).toContain('Third Todo');
  });

  it('should return todos ordered by created_at descending (newest first)', async () => {
    // Create todos with slight time delays to ensure different timestamps
    const firstTodo = await db.insert(todosTable)
      .values({
        title: 'Oldest Todo',
        description: 'Created first',
        completed: false
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondTodo = await db.insert(todosTable)
      .values({
        title: 'Middle Todo',
        description: 'Created second',
        completed: false
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const thirdTodo = await db.insert(todosTable)
      .values({
        title: 'Newest Todo',
        description: 'Created last',
        completed: false
      })
      .returning()
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    
    // Verify descending order by created_at (newest first)
    expect(result[0].title).toBe('Newest Todo');
    expect(result[1].title).toBe('Middle Todo');
    expect(result[2].title).toBe('Oldest Todo');

    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThanOrEqual(result[2].created_at.getTime());
  });

  it('should handle todos with various completion states', async () => {
    // Create mix of completed and uncompleted todos
    await db.insert(todosTable)
      .values([
        {
          title: 'Completed Todo',
          description: 'This is done',
          completed: true
        },
        {
          title: 'Incomplete Todo',
          description: 'Still working on this',
          completed: false
        },
        {
          title: 'Another Completed Todo',
          description: null,
          completed: true
        }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);

    const completedTodos = result.filter(todo => todo.completed);
    const incompleteTodos = result.filter(todo => !todo.completed);

    expect(completedTodos).toHaveLength(2);
    expect(incompleteTodos).toHaveLength(1);

    // Verify completion states are preserved correctly
    expect(completedTodos.every(todo => todo.completed === true)).toBe(true);
    expect(incompleteTodos.every(todo => todo.completed === false)).toBe(true);
  });

  it('should handle todos with null descriptions', async () => {
    // Create todos with both null and non-null descriptions
    await db.insert(todosTable)
      .values([
        {
          title: 'Todo with description',
          description: 'This has a description',
          completed: false
        },
        {
          title: 'Todo without description',
          description: null,
          completed: false
        }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);

    const todoWithDescription = result.find(todo => todo.title === 'Todo with description');
    const todoWithoutDescription = result.find(todo => todo.title === 'Todo without description');

    expect(todoWithDescription?.description).toBe('This has a description');
    expect(todoWithoutDescription?.description).toBeNull();
  });
});