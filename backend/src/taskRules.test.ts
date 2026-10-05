import {describe,expect,it} from 'vitest';
import {canTransition,validProgress,validSchedule} from './taskRules.js';
describe('task workflow rules',()=>{
 it('allows the execution and revision paths',()=>{expect(canTransition('TODO','IN_PROGRESS')).toBe(true);expect(canTransition('IN_PROGRESS','IN_REVIEW')).toBe(true);expect(canTransition('IN_REVIEW','REVISION_REQUIRED')).toBe(true);expect(canTransition('REVISION_REQUIRED','IN_REVIEW')).toBe(true);expect(canTransition('IN_REVIEW','COMPLETED')).toBe(true)});
 it('rejects invalid transitions',()=>{expect(canTransition('TODO','COMPLETED')).toBe(false);expect(canTransition('COMPLETED','IN_PROGRESS')).toBe(false);expect(canTransition('CANCELLED','TODO')).toBe(false)});
 it('validates persisted progress bounds',()=>{expect(validProgress(0)).toBe(true);expect(validProgress(100)).toBe(true);expect(validProgress(-1)).toBe(false);expect(validProgress(101)).toBe(false);expect(validProgress(2.5)).toBe(false)});
 it('validates schedules',()=>{expect(validSchedule(new Date('2026-10-01'),new Date('2026-10-20'))).toBe(true);expect(validSchedule(new Date('2026-10-20'),new Date('2026-10-01'))).toBe(false)});
});
