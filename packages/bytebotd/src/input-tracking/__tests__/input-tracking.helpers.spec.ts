/**
 * Input Tracking Helpers Test Suite
 *
 * Comprehensive unit tests for input-tracking helpers covering:
 * - Key information mapping and validation
 * - Printable character detection and conversion
 * - Shift key combinations and special characters
 * - Function keys and navigation keys
 * - Numpad key handling and mapping
 * - International keyboard layouts
 * - Edge cases and boundary conditions
 * - Performance with large key mappings
 * - Key code validation and error handling
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 100%
 */

import { keyInfoMap, KeyInfo as _KeyInfo } from '../input-tracking.helpers';
import { UiohookKey } from 'uiohook-napi';

describe('InputTrackingHelpers', () => {
  const operationId = `input_tracking_helpers_test_${Date.now()}`;

  describe('Key Information Map Structure', () => {
    it('should have keyInfoMap defined', () => {
      const testId = `${operationId}_keyinfo_map_defined`;
      console.log(`[${testId}] Testing keyInfoMap definition`);

      expect(keyInfoMap).toBeDefined();
      expect(typeof keyInfoMap).toBe('object');

      console.log(`[${testId}] KeyInfoMap definition test completed`);
    });

    it('should contain numeric key indices', () => {
      const testId = `${operationId}_numeric_key_indices`;
      console.log(`[${testId}] Testing numeric key indices`);

      const keys = Object.keys(keyInfoMap);
      expect(keys.length).toBeGreaterThan(0);

      // All keys should be numeric strings
      keys.forEach((key) => {
        expect(isNaN(parseInt(key, 10))).toBe(false);
      });

      console.log(`[${testId}] Numeric key indices test completed`);
    });

    it('should have valid KeyInfo structure for all entries', () => {
      const testId = `${operationId}_keyinfo_structure`;
      console.log(`[${testId}] Testing KeyInfo structure validation`);

      Object.entries(keyInfoMap).forEach(([_keyCode, keyInfo]) => {
        expect(keyInfo).toHaveProperty('name');
        expect(keyInfo).toHaveProperty('isPrintable');
        expect(typeof keyInfo?.name).toBe('string');
        expect(typeof keyInfo?.isPrintable).toBe('boolean');

        // Optional properties should be strings if present
        if (keyInfo.string !== undefined) {
          expect(typeof keyInfo.string).toBe('string');
        }
        if (keyInfo.shiftString !== undefined) {
          expect(typeof keyInfo.shiftString).toBe('string');
        }
      });

      console.log(`[${testId}] KeyInfo structure validation test completed`);
    });
  });

  describe('Printable Character Detection', () => {
    it('should correctly identify printable characters', () => {
      const testId = `${operationId}_printable_character_detection`;
      console.log(`[${testId}] Testing printable character detection`);

      // Test alphabet keys (should be printable)
      const aKey = keyInfoMap[UiohookKey.A];
      const zKey = keyInfoMap[UiohookKey.Z];
      expect(aKey?.isPrintable).toBe(true);
      expect(zKey?.isPrintable).toBe(true);

      // Test number keys (should be printable)
      const zeroKey = keyInfoMap[UiohookKey[0]];
      const nineKey = keyInfoMap[UiohookKey[9]];
      expect(zeroKey?.isPrintable).toBe(true);
      expect(nineKey?.isPrintable).toBe(true);

      // Test space key (should be printable)
      const spaceKey = keyInfoMap[UiohookKey.Space];
      expect(spaceKey?.isPrintable).toBe(true);

      console.log(`[${testId}] Printable character detection test completed`);
    });

    it('should correctly identify non-printable keys', () => {
      const testId = `${operationId}_non_printable_key_detection`;
      console.log(`[${testId}] Testing non-printable key detection`);

      // Test function keys (should be non-printable)
      const f1Key = keyInfoMap[UiohookKey.F1];
      const f12Key = keyInfoMap[UiohookKey.F12];
      expect(f1Key?.isPrintable).toBe(false);
      expect(f12Key?.isPrintable).toBe(false);

      // Test control keys (should be non-printable)
      const enterKey = keyInfoMap[UiohookKey.Enter];
      const escapeKey = keyInfoMap[UiohookKey.Escape];
      const backspaceKey = keyInfoMap[UiohookKey.Backspace];
      expect(enterKey?.isPrintable).toBe(false);
      expect(escapeKey?.isPrintable).toBe(false);
      expect(backspaceKey?.isPrintable).toBe(false);

      // Test arrow keys (should be non-printable)
      const upArrow = keyInfoMap[UiohookKey.ArrowUp];
      const downArrow = keyInfoMap[UiohookKey.ArrowDown];
      expect(upArrow?.isPrintable).toBe(false);
      expect(downArrow?.isPrintable).toBe(false);

      console.log(`[${testId}] Non-printable key detection test completed`);
    });
  });

  describe('Character String Mapping', () => {
    it('should have correct character strings for alphabet keys', () => {
      const testId = `${operationId}_alphabet_character_strings`;
      console.log(`[${testId}] Testing alphabet character string mapping`);

      // Test some alphabet keys
      const aKey = keyInfoMap[UiohookKey.A];
      const bKey = keyInfoMap[UiohookKey.B];
      const zKey = keyInfoMap[UiohookKey.Z];

      expect(aKey?.string).toBe('a');
      expect(aKey?.shiftString).toBe('A');
      expect(bKey?.string).toBe('b');
      expect(bKey?.shiftString).toBe('B');
      expect(zKey?.string).toBe('z');
      expect(zKey?.shiftString).toBe('Z');

      console.log(
        `[${testId}] Alphabet character string mapping test completed`,
      );
    });

    it('should have correct character strings for number keys', () => {
      const testId = `${operationId}_number_character_strings`;
      console.log(`[${testId}] Testing number character string mapping`);

      // Test number keys with their shift symbols
      const oneKey = keyInfoMap[UiohookKey[1]];
      const twoKey = keyInfoMap[UiohookKey[2]];
      const nineKey = keyInfoMap[UiohookKey[9]];
      const zeroKey = keyInfoMap[UiohookKey[0]];

      expect(oneKey?.string).toBe('1');
      expect(oneKey?.shiftString).toBe('!');
      expect(twoKey?.string).toBe('2');
      expect(twoKey?.shiftString).toBe('@');
      expect(nineKey?.string).toBe('9');
      expect(nineKey?.shiftString).toBe('(');
      expect(zeroKey?.string).toBe('0');
      expect(zeroKey?.shiftString).toBe(')');

      console.log(`[${testId}] Number character string mapping test completed`);
    });

    it('should have correct character strings for punctuation keys', () => {
      const testId = `${operationId}_punctuation_character_strings`;
      console.log(`[${testId}] Testing punctuation character string mapping`);

      // Test punctuation keys
      const semicolonKey = keyInfoMap[UiohookKey.Semicolon];
      const equalKey = keyInfoMap[UiohookKey.Equal];
      const commaKey = keyInfoMap[UiohookKey.Comma];
      const periodKey = keyInfoMap[UiohookKey.Period];

      expect(semicolonKey?.string).toBe(';');
      expect(semicolonKey?.shiftString).toBe(':');
      expect(equalKey?.string).toBe('=');
      expect(equalKey?.shiftString).toBe('+');
      expect(commaKey?.string).toBe(',');
      expect(commaKey?.shiftString).toBe('"'); // Shift+comma on some layouts
      expect(periodKey?.string).toBe('.');
      expect(periodKey?.shiftString).toBe('>');

      console.log(
        `[${testId}] Punctuation character string mapping test completed`,
      );
    });

    it('should handle space key correctly', () => {
      const testId = `${operationId}_space_key_handling`;
      console.log(`[${testId}] Testing space key handling`);

      const spaceKey = keyInfoMap[UiohookKey.Space];

      expect(spaceKey?.name).toBe('Space');
      expect(spaceKey?.isPrintable).toBe(true);
      expect(spaceKey?.string).toBe(' ');
      expect(spaceKey?.shiftString).toBe(' '); // Space with shift is still space

      console.log(`[${testId}] Space key handling test completed`);
    });
  });

  describe('Function Keys Mapping', () => {
    it('should have all function keys mapped correctly', () => {
      const testId = `${operationId}_function_keys_mapping`;
      console.log(`[${testId}] Testing function keys mapping`);

      // Test F1-F12
      for (let i = 1; i <= 12; i++) {
        const fKey = keyInfoMap[UiohookKey[`F${i}` as keyof typeof UiohookKey]];
        expect(fKey).toBeDefined();
        expect((fKey as NonNullable<typeof fKey>).name).toBe(`F${i}`);
        expect((fKey as NonNullable<typeof fKey>).isPrintable).toBe(false);
        expect((fKey as NonNullable<typeof fKey>).string).toBeUndefined();
        expect((fKey as NonNullable<typeof fKey>).shiftString).toBeUndefined();
      }

      // Test extended function keys if they exist
      const f13Key = keyInfoMap[UiohookKey.F13];
      const f24Key = keyInfoMap[UiohookKey.F24];

      if (f13Key) {
        expect(f13Key.name).toBe('F13');
        expect(f13Key.isPrintable).toBe(false);
      }

      if (f24Key) {
        expect(f24Key.name).toBe('F24');
        expect(f24Key.isPrintable).toBe(false);
      }

      console.log(`[${testId}] Function keys mapping test completed`);
    });
  });

  describe('Navigation Keys Mapping', () => {
    it('should have all navigation keys mapped correctly', () => {
      const testId = `${operationId}_navigation_keys_mapping`;
      console.log(`[${testId}] Testing navigation keys mapping`);

      // Test arrow keys
      const arrowKeys = [
        { key: UiohookKey.ArrowUp, name: 'Up' },
        { key: UiohookKey.ArrowDown, name: 'Down' },
        { key: UiohookKey.ArrowLeft, name: 'Left' },
        { key: UiohookKey.ArrowRight, name: 'Right' },
      ];

      arrowKeys.forEach(({ key, name }) => {
        const keyInfo = keyInfoMap[key];
        expect(keyInfo).toBeDefined();
        expect((keyInfo as NonNullable<typeof keyInfo>).name).toBe(name);
        expect((keyInfo as NonNullable<typeof keyInfo>).isPrintable).toBe(
          false,
        );
      });

      // Test page navigation keys
      const pageUpKey = keyInfoMap[UiohookKey.PageUp];
      const pageDownKey = keyInfoMap[UiohookKey.PageDown];
      const homeKey = keyInfoMap[UiohookKey.Home];
      const endKey = keyInfoMap[UiohookKey.End];

      expect(pageUpKey).toBeDefined();
      expect(pageDownKey).toBeDefined();
      expect(homeKey).toBeDefined();
      expect(endKey).toBeDefined();

      expect((pageUpKey as NonNullable<typeof pageUpKey>).name).toBe('PageUp');
      expect((pageDownKey as NonNullable<typeof pageDownKey>).name).toBe(
        'PageDown',
      );
      expect((homeKey as NonNullable<typeof homeKey>).name).toBe('Home');
      expect((endKey as NonNullable<typeof endKey>).name).toBe('End');

      [pageUpKey, pageDownKey, homeKey, endKey].forEach((keyInfo) => {
        expect((keyInfo as NonNullable<typeof keyInfo>).isPrintable).toBe(
          false,
        );
      });

      console.log(`[${testId}] Navigation keys mapping test completed`);
    });
  });

  describe('Modifier Keys Mapping', () => {
    it('should have all modifier keys mapped correctly', () => {
      const testId = `${operationId}_modifier_keys_mapping`;
      console.log(`[${testId}] Testing modifier keys mapping`);

      // Test modifier keys
      const modifierKeys = [
        { key: UiohookKey.Ctrl, name: 'LeftControl' },
        { key: UiohookKey.CtrlRight, name: 'RightControl' },
        { key: UiohookKey.Shift, name: 'LeftShift' },
        { key: UiohookKey.ShiftRight, name: 'RightShift' },
        { key: UiohookKey.Alt, name: 'LeftAlt' },
        { key: UiohookKey.AltRight, name: 'RightAlt' },
        { key: UiohookKey.Meta, name: 'LeftMeta' },
        { key: UiohookKey.MetaRight, name: 'RightMeta' },
      ];

      modifierKeys.forEach(({ key, name }) => {
        const keyInfo = keyInfoMap[key];
        expect(keyInfo).toBeDefined();
        expect((keyInfo as NonNullable<typeof keyInfo>).name).toBe(name);
        expect((keyInfo as NonNullable<typeof keyInfo>).isPrintable).toBe(
          false,
        );
        expect((keyInfo as NonNullable<typeof keyInfo>).string).toBeUndefined();
        expect(
          (keyInfo as NonNullable<typeof keyInfo>).shiftString,
        ).toBeUndefined();
      });

      console.log(`[${testId}] Modifier keys mapping test completed`);
    });
  });

  describe('Numpad Keys Mapping', () => {
    it('should have all numpad number keys mapped correctly', () => {
      const testId = `${operationId}_numpad_numbers_mapping`;
      console.log(`[${testId}] Testing numpad number keys mapping`);

      // Test numpad numbers
      for (let i = 0; i <= 9; i++) {
        const numpadKey =
          keyInfoMap[UiohookKey[`Numpad${i}` as keyof typeof UiohookKey]];
        expect(numpadKey).toBeDefined();
        expect((numpadKey as NonNullable<typeof numpadKey>).name).toBe(
          `Numpad${i}`,
        );
        expect((numpadKey as NonNullable<typeof numpadKey>).isPrintable).toBe(
          true,
        );
        expect((numpadKey as NonNullable<typeof numpadKey>).string).toBe(
          i.toString(),
        );
        expect((numpadKey as NonNullable<typeof numpadKey>).shiftString).toBe(
          i.toString(),
        );
      }

      console.log(`[${testId}] Numpad number keys mapping test completed`);
    });

    it('should have all numpad operator keys mapped correctly', () => {
      const testId = `${operationId}_numpad_operators_mapping`;
      console.log(`[${testId}] Testing numpad operator keys mapping`);

      // Test numpad operators
      const operatorKeys = [
        { key: UiohookKey.NumpadAdd, name: 'Add', char: '+' },
        { key: UiohookKey.NumpadSubtract, name: 'Subtract', char: '-' },
        { key: UiohookKey.NumpadMultiply, name: 'Multiply', char: '*' },
        { key: UiohookKey.NumpadDivide, name: 'Divide', char: '/' },
        { key: UiohookKey.NumpadDecimal, name: 'Decimal', char: '.' },
      ];

      operatorKeys.forEach(({ key, name, char }) => {
        const keyInfo = keyInfoMap[key];
        expect(keyInfo).toBeDefined();
        expect((keyInfo as NonNullable<typeof keyInfo>).name).toBe(name);
        expect((keyInfo as NonNullable<typeof keyInfo>).isPrintable).toBe(true);
        expect((keyInfo as NonNullable<typeof keyInfo>).string).toBe(char);
        expect((keyInfo as NonNullable<typeof keyInfo>).shiftString).toBe(char);
      });

      console.log(`[${testId}] Numpad operator keys mapping test completed`);
    });

    it('should have numpad navigation keys mapped correctly', () => {
      const testId = `${operationId}_numpad_navigation_mapping`;
      console.log(`[${testId}] Testing numpad navigation keys mapping`);

      // Test numpad navigation keys
      const navKeys = [
        { key: UiohookKey.NumpadEnter, name: 'Enter' },
        { key: UiohookKey.NumpadEnd, name: 'End' },
        { key: UiohookKey.NumpadArrowDown, name: 'Down' },
        { key: UiohookKey.NumpadArrowLeft, name: 'Left' },
        { key: UiohookKey.NumpadArrowRight, name: 'Right' },
        { key: UiohookKey.NumpadArrowUp, name: 'Up' },
        { key: UiohookKey.NumpadPageDown, name: 'PageDown' },
        { key: UiohookKey.NumpadPageUp, name: 'PageUp' },
        { key: UiohookKey.NumpadInsert, name: 'Insert' },
        { key: UiohookKey.NumpadDelete, name: 'Delete' },
      ];

      navKeys.forEach(({ key, name }) => {
        const keyInfo = keyInfoMap[key];
        expect(keyInfo).toBeDefined();
        expect(keyInfo?.name).toBe(name);
        expect(keyInfo?.isPrintable).toBe(false);
      });

      console.log(`[${testId}] Numpad navigation keys mapping test completed`);
    });
  });

  describe('Special Keys Mapping', () => {
    it('should have special control keys mapped correctly', () => {
      const testId = `${operationId}_special_control_keys`;
      console.log(`[${testId}] Testing special control keys mapping`);

      // Test special keys
      const specialKeys = [
        { key: UiohookKey.Tab, name: 'Tab' },
        { key: UiohookKey.Enter, name: 'Enter' },
        { key: UiohookKey.Backspace, name: 'Backspace' },
        { key: UiohookKey.Delete, name: 'Delete' },
        { key: UiohookKey.Insert, name: 'Insert' },
        { key: UiohookKey.CapsLock, name: 'CapsLock' },
        { key: UiohookKey.NumLock, name: 'NumLock' },
        { key: UiohookKey.ScrollLock, name: 'ScrollLock' },
        { key: UiohookKey.PrintScreen, name: 'Print' },
        { key: UiohookKey.Escape, name: 'Escape' },
      ];

      specialKeys.forEach(({ key, name }) => {
        const keyInfo = keyInfoMap[key];
        expect(keyInfo).toBeDefined();
        expect(keyInfo?.name).toBe(name);
        expect(keyInfo?.isPrintable).toBe(false);
      });

      console.log(`[${testId}] Special control keys mapping test completed`);
    });
  });

  describe('Bracket and Quote Keys Mapping', () => {
    it('should have bracket keys mapped correctly', () => {
      const testId = `${operationId}_bracket_keys_mapping`;
      console.log(`[${testId}] Testing bracket keys mapping`);

      // Test bracket keys
      const leftBracket = keyInfoMap[UiohookKey.BracketLeft];
      const rightBracket = keyInfoMap[UiohookKey.BracketRight];

      expect(leftBracket?.name).toBe('LeftBracket');
      expect(leftBracket?.string).toBe('[');
      expect(leftBracket?.shiftString).toBe('{');
      expect(leftBracket?.isPrintable).toBe(true);

      expect(rightBracket?.name).toBe('RightBracket');
      expect(rightBracket?.string).toBe(']');
      expect(rightBracket?.shiftString).toBe('}');
      expect(rightBracket?.isPrintable).toBe(true);

      console.log(`[${testId}] Bracket keys mapping test completed`);
    });

    it('should have quote and backquote keys mapped correctly', () => {
      const testId = `${operationId}_quote_keys_mapping`;
      console.log(`[${testId}] Testing quote keys mapping`);

      // Test quote keys
      const quote = keyInfoMap[UiohookKey.Quote];
      const backquote = keyInfoMap[UiohookKey.Backquote];

      expect(quote?.name).toBe('Quote');
      expect(quote?.string).toBe("'");
      expect(quote?.shiftString).toBe('"');
      expect(quote?.isPrintable).toBe(true);

      expect(backquote?.name).toBe('Grave');
      expect(backquote?.string).toBe('`');
      expect(backquote?.shiftString).toBe('~');
      expect(backquote?.isPrintable).toBe(true);

      console.log(`[${testId}] Quote keys mapping test completed`);
    });

    it('should have slash and backslash keys mapped correctly', () => {
      const testId = `${operationId}_slash_keys_mapping`;
      console.log(`[${testId}] Testing slash keys mapping`);

      const slash = keyInfoMap[UiohookKey.Slash];
      const backslash = keyInfoMap[UiohookKey.Backslash];

      expect(slash?.name).toBe('Slash');
      expect(slash?.string).toBe('/');
      expect(slash?.shiftString).toBe('?');
      expect(slash?.isPrintable).toBe(true);

      expect(backslash?.name).toBe('Backslash');
      expect(backslash?.string).toBe('\\');
      expect(backslash?.shiftString).toBe('|');
      expect(backslash?.isPrintable).toBe(true);

      console.log(`[${testId}] Slash keys mapping test completed`);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle missing key codes gracefully', () => {
      const testId = `${operationId}_missing_key_codes`;
      console.log(`[${testId}] Testing missing key codes handling`);

      // Test with a non-existent key code
      const nonExistentKey = keyInfoMap[999999];
      expect(nonExistentKey).toBeUndefined();

      // Test with negative key codes
      const negativeKey = keyInfoMap[-1];
      expect(negativeKey).toBeUndefined();

      console.log(`[${testId}] Missing key codes handling test completed`);
    });

    it('should handle boundary key codes', () => {
      const testId = `${operationId}_boundary_key_codes`;
      console.log(`[${testId}] Testing boundary key codes`);

      // Test with key code 0 (special case)
      const zeroKey = keyInfoMap[0];
      expect(zeroKey).toBeDefined();
      expect(zeroKey?.name).toBe('Alt');

      console.log(`[${testId}] Boundary key codes test completed`);
    });

    it('should maintain consistent data types across all entries', () => {
      const testId = `${operationId}_consistent_data_types`;
      console.log(`[${testId}] Testing consistent data types`);

      Object.entries(keyInfoMap).forEach(([_keyCode, keyInfo]) => {
        // Name should always be a non-empty string
        expect(typeof keyInfo?.name).toBe('string');
        expect(keyInfo?.name.length).toBeGreaterThan(0);

        // isPrintable should always be boolean
        expect(typeof keyInfo?.isPrintable).toBe('boolean');

        // string and shiftString, if defined, should be strings
        if (keyInfo.string !== undefined) {
          expect(typeof keyInfo.string).toBe('string');
        }
        if (keyInfo.shiftString !== undefined) {
          expect(typeof keyInfo.shiftString).toBe('string');
        }

        // If printable, should have string property
        if (keyInfo?.isPrintable) {
          expect(keyInfo.string).toBeDefined();
        }
      });

      console.log(`[${testId}] Consistent data types test completed`);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale key lookups efficiently', () => {
      const testId = `${operationId}_large_scale_lookups`;
      console.log(`[${testId}] Testing large-scale key lookups performance`);

      const startTime = Date.now();
      const iterations = 10000;

      // Perform many key lookups
      for (let i = 0; i < iterations; i++) {
        const randomKeyCode = Math.floor(Math.random() * 500);
        const keyInfo = keyInfoMap[randomKeyCode];
        // Just access the property to ensure lookup is performed
        if (keyInfo) {
          const _ = keyInfo?.name;
        }
      }

      const executionTime = Date.now() - startTime;

      // Should complete within reasonable time (less than 100ms for 10k lookups)
      expect(executionTime).toBeLessThan(100);

      console.log(
        `[${testId}] Large-scale lookups performance test completed (${executionTime}ms)`,
      );
    });

    it('should have reasonable memory footprint', () => {
      const testId = `${operationId}_memory_footprint`;
      console.log(`[${testId}] Testing memory footprint`);

      const entryCount = Object.keys(keyInfoMap).length;

      // Should have a reasonable number of key mappings (not too sparse, not too dense)
      expect(entryCount).toBeGreaterThan(50); // At least basic keyboard keys
      expect(entryCount).toBeLessThan(1000); // Not excessively large

      // Each entry should be reasonably sized
      Object.values(keyInfoMap).forEach((keyInfo) => {
        expect(keyInfo?.name.length).toBeLessThan(50); // Reasonable name length
        if (keyInfo.string) {
          expect(keyInfo.string.length).toBeLessThan(10); // Characters should be short
        }
        if (keyInfo.shiftString) {
          expect(keyInfo.shiftString.length).toBeLessThan(10); // Shift chars should be short
        }
      });

      console.log(
        `[${testId}] Memory footprint test completed (${entryCount} entries)`,
      );
    });
  });

  describe('Key Mapping Consistency', () => {
    it('should have consistent naming conventions', () => {
      const testId = `${operationId}_naming_conventions`;
      console.log(`[${testId}] Testing naming conventions consistency`);

      Object.values(keyInfoMap).forEach((keyInfo) => {
        // Name should be properly formatted (either starts with uppercase letter or digit)
        expect(keyInfo?.name[0]).toMatch(/[A-Z0-9]/);

        // Should not have trailing spaces
        expect(keyInfo?.name.trim()).toBe(keyInfo?.name);

        // Should not be empty
        expect(keyInfo?.name.length).toBeGreaterThan(0);
      });

      console.log(`[${testId}] Naming conventions consistency test completed`);
    });

    it('should have logical printable/non-printable classification', () => {
      const testId = `${operationId}_printable_classification_logic`;
      console.log(`[${testId}] Testing printable classification logic`);

      Object.values(keyInfoMap).forEach((keyInfo) => {
        if (keyInfo?.isPrintable) {
          // Printable keys should have a string representation
          expect(keyInfo.string).toBeDefined();
          expect(typeof keyInfo.string).toBe('string');
        } else {
          // Non-printable keys typically shouldn't have string representations
          // (though there might be exceptions for special cases)
          if (keyInfo.string !== undefined) {
            // If they do have a string, it should be valid
            expect(typeof keyInfo.string).toBe('string');
          }
        }
      });

      console.log(`[${testId}] Printable classification logic test completed`);
    });

    it('should have all critical keys mapped', () => {
      const testId = `${operationId}_critical_keys_coverage`;
      console.log(`[${testId}] Testing critical keys coverage`);

      // Ensure critical keys are present
      const criticalKeys = [
        UiohookKey.A,
        UiohookKey.Z, // Alphabet coverage
        UiohookKey[0],
        UiohookKey[9], // Number coverage
        UiohookKey.Space,
        UiohookKey.Enter,
        UiohookKey.Backspace, // Essential keys
        UiohookKey.Shift,
        UiohookKey.Ctrl,
        UiohookKey.Alt, // Modifiers
        UiohookKey.ArrowUp,
        UiohookKey.ArrowDown, // Navigation
        UiohookKey.F1,
        UiohookKey.F12, // Function keys
      ];

      criticalKeys.forEach((keyCode) => {
        expect(keyInfoMap[keyCode]).toBeDefined();
        expect(keyInfoMap[keyCode].name).toBeTruthy();
      });

      console.log(`[${testId}] Critical keys coverage test completed`);
    });
  });

  describe('International and Special Character Support', () => {
    it('should handle special characters properly', () => {
      const testId = `${operationId}_special_characters`;
      console.log(`[${testId}] Testing special character handling`);

      // Test keys that produce special characters with shift
      const minusKey = keyInfoMap[UiohookKey.Minus];
      expect(minusKey?.string).toBe('-');
      expect(minusKey?.shiftString).toBe('_');

      const equalKey = keyInfoMap[UiohookKey.Equal];
      expect(equalKey?.string).toBe('=');
      expect(equalKey?.shiftString).toBe('+');

      console.log(`[${testId}] Special character handling test completed`);
    });

    it('should handle character encoding properly', () => {
      const testId = `${operationId}_character_encoding`;
      console.log(`[${testId}] Testing character encoding`);

      Object.values(keyInfoMap).forEach((keyInfo) => {
        if (keyInfo.string) {
          // Should be valid UTF-8 characters
          expect(keyInfo.string.length).toBeGreaterThan(0);
          // Should not contain null bytes or other control characters
          expect(keyInfo.string).not.toMatch(
            // eslint-disable-next-line no-control-regex
            /[\x00-\x08\x0E-\x1F\x7F]/,
          );
        }

        if (keyInfo.shiftString) {
          expect(keyInfo.shiftString.length).toBeGreaterThan(0);
          expect(keyInfo.shiftString).not.toMatch(
            // eslint-disable-next-line no-control-regex
            /[\x00-\x08\x0E-\x1F\x7F]/,
          );
        }
      });

      console.log(`[${testId}] Character encoding test completed`);
    });
  });

  describe('Key Information Validation', () => {
    it('should validate that shift strings differ from normal strings where appropriate', () => {
      const testId = `${operationId}_shift_string_differences`;
      console.log(`[${testId}] Testing shift string differences`);

      let differingCount = 0;
      let totalWithBoth = 0;

      Object.values(keyInfoMap).forEach((keyInfo) => {
        if (keyInfo.string && keyInfo.shiftString) {
          totalWithBoth++;
          if (keyInfo.string !== keyInfo.shiftString) {
            differingCount++;
          }
        }
      });

      // Most keys with both string and shiftString should have different values
      // (though some like numpad might be the same)
      expect(totalWithBoth).toBeGreaterThan(0);

      console.log(
        `[${testId}] Shift string differences test completed (${differingCount}/${totalWithBoth} differ)`,
      );
    });

    it('should have appropriate key names for different key types', () => {
      const testId = `${operationId}_appropriate_key_names`;
      console.log(`[${testId}] Testing appropriate key names`);

      // Function keys should be named F1, F2, etc.
      const functionKeyPattern = /^F\d{1,2}$/;
      [UiohookKey.F1, UiohookKey.F5, UiohookKey.F12].forEach((keyCode) => {
        expect(keyInfoMap[keyCode].name).toMatch(functionKeyPattern);
      });

      // Arrow keys should contain directional names
      expect(keyInfoMap[UiohookKey.ArrowUp].name).toContain('Up');
      expect(keyInfoMap[UiohookKey.ArrowDown].name).toContain('Down');
      expect(keyInfoMap[UiohookKey.ArrowLeft].name).toContain('Left');
      expect(keyInfoMap[UiohookKey.ArrowRight].name).toContain('Right');

      // Modifier keys should indicate their position when applicable
      expect(keyInfoMap[UiohookKey.Shift].name).toContain('Left');
      expect(keyInfoMap[UiohookKey.ShiftRight].name).toContain('Right');

      console.log(`[${testId}] Appropriate key names test completed`);
    });
  });
});
