import { describe, it, expect } from 'vitest';
import { DEFAULT_PARAMS, DEFAULT_MATERIAL, PARAM_SCHEMA } from '../../js/editor-schema.js';

describe('DEFAULT_PARAMS', () => {
  const expectedTypes = [
    'box', 'sphere', 'cylinder', 'cone', 'plane', 'torus',
    'column', 'stairs', 'pediment', 'head', 'terrain', 'group'
  ];

  it('has entries for all geometry types', () => {
    for (const type of expectedTypes) {
      expect(DEFAULT_PARAMS).toHaveProperty(type);
    }
  });

  it('group has empty params', () => {
    expect(DEFAULT_PARAMS.group).toEqual({});
  });

  it('box has width, height, depth as positive numbers', () => {
    const { width, height, depth } = DEFAULT_PARAMS.box;
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(depth).toBeGreaterThan(0);
  });

  it('terrain has all expected params', () => {
    const t = DEFAULT_PARAMS.terrain;
    expect(t).toHaveProperty('width');
    expect(t).toHaveProperty('depth');
    expect(t).toHaveProperty('segments');
    expect(t).toHaveProperty('hillHeight');
    expect(t).toHaveProperty('hillFrequency');
    expect(t).toHaveProperty('seed');
    expect(t).toHaveProperty('bowl');
  });

  it('all param values are numbers', () => {
    for (const [type, params] of Object.entries(DEFAULT_PARAMS)) {
      for (const [key, value] of Object.entries(params)) {
        expect(typeof value, `${type}.${key} should be a number`).toBe('number');
      }
    }
  });
});

describe('DEFAULT_MATERIAL', () => {
  it('has color, roughness, metalness', () => {
    expect(DEFAULT_MATERIAL).toHaveProperty('color');
    expect(DEFAULT_MATERIAL).toHaveProperty('roughness');
    expect(DEFAULT_MATERIAL).toHaveProperty('metalness');
  });

  it('roughness is between 0 and 1', () => {
    expect(DEFAULT_MATERIAL.roughness).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_MATERIAL.roughness).toBeLessThanOrEqual(1);
  });

  it('metalness is between 0 and 1', () => {
    expect(DEFAULT_MATERIAL.metalness).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_MATERIAL.metalness).toBeLessThanOrEqual(1);
  });
});

describe('PARAM_SCHEMA', () => {
  it('has entries for all types in DEFAULT_PARAMS', () => {
    for (const type of Object.keys(DEFAULT_PARAMS)) {
      expect(PARAM_SCHEMA, `missing schema for "${type}"`).toHaveProperty(type);
    }
  });

  it('group has empty schema array', () => {
    expect(PARAM_SCHEMA.group).toEqual([]);
  });

  it('all schema entries are arrays', () => {
    for (const [type, schema] of Object.entries(PARAM_SCHEMA)) {
      expect(Array.isArray(schema), `${type} schema should be an array`).toBe(true);
    }
  });

  it('every field has required properties: key, label, type', () => {
    for (const [typeName, fields] of Object.entries(PARAM_SCHEMA)) {
      for (const field of fields) {
        expect(field, `${typeName} field missing key`).toHaveProperty('key');
        expect(field, `${typeName} field missing label`).toHaveProperty('label');
        expect(field, `${typeName} field missing type`).toHaveProperty('type');
      }
    }
  });

  it('all field types are "number"', () => {
    for (const [typeName, fields] of Object.entries(PARAM_SCHEMA)) {
      for (const field of fields) {
        expect(field.type, `${typeName}.${field.key} type`).toBe('number');
      }
    }
  });

  it('labels are non-empty strings', () => {
    for (const [typeName, fields] of Object.entries(PARAM_SCHEMA)) {
      for (const field of fields) {
        expect(field.label.length, `${typeName}.${field.key} label`).toBeGreaterThan(0);
      }
    }
  });

  it('step values are positive when present', () => {
    for (const [typeName, fields] of Object.entries(PARAM_SCHEMA)) {
      for (const field of fields) {
        if (field.step !== undefined) {
          expect(field.step, `${typeName}.${field.key} step`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('no duplicate keys within a type', () => {
    for (const [typeName, fields] of Object.entries(PARAM_SCHEMA)) {
      const keys = fields.map(f => f.key);
      const unique = new Set(keys);
      expect(keys.length, `${typeName} has duplicate keys`).toBe(unique.size);
    }
  });
});
