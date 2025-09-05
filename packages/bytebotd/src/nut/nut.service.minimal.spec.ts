/**
 * Minimal NUT Service Test
 * Simple test to verify Jest and NUT service basic functionality
 */

import { Test, TestingModule } from '@nestjs/testing';

// Mock external dependencies first
jest.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    pressKey: jest.fn().mockResolvedValue(undefined),
    releaseKey: jest.fn().mockResolvedValue(undefined),
    config: { autoDelayMs: 100 },
  },
  mouse: {
    setPosition: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    getPosition: jest.fn().mockResolvedValue({ x: 100, y: 200 }),
    config: { autoDelayMs: 100 },
  },
  screen: {
    capture: jest.fn().mockResolvedValue(undefined),
  },
  Point: jest.fn().mockImplementation((x: number, y: number) => ({ x, y })),
  Key: {
    A: 'A',
    B: 'B',
    Space: 'Space',
    Enter: 'Enter',
    LeftShift: 'LeftShift',
    LeftControl: 'LeftControl',
  },
  Button: { LEFT: 'LEFT', RIGHT: 'RIGHT', MIDDLE: 'MIDDLE' },
  FileType: { PNG: 'PNG' },
}));

// Mock dynamic fs import
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

import { NutService } from './nut.service';

describe('NutService - Minimal Test', () => {
  let service: NutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NutService],
    }).compile();

    service = module.get<NutService>(NutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return service status', () => {
    const status = service.getServiceStatus();
    expect(status).toBeDefined();
    expect(typeof status.healthy).toBe('boolean');
  });
});
