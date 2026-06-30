import { create } from 'zustand';
import { type AutomationServerEvent, type EventCategory } from '@/lib/services/automation/automation-types';

const MAX_EVENTS = 50;

interface AutomationEventsState {
  events: AutomationServerEvent[];
  lastEvent: AutomationServerEvent | null;
  addEvent: (event: AutomationServerEvent) => void;
  clearEvents: () => void;
  getEventsByCategory: (category: EventCategory) => AutomationServerEvent[];
  getEventsByJobId: (jobId: string) => AutomationServerEvent[];
}

export const useAutomationEventsStore = create<AutomationEventsState>((set, get) => ({
  events: [],
  lastEvent: null,
  addEvent: (event) =>
    set((state) => {
      const jobId = 'job_id' in event ? event.job_id : '';
      const exists = state.events.some(
        (e) => {
          const eJobId = 'job_id' in e ? e.job_id : '';
          return eJobId === jobId && e.type === event.type && e.timestamp === event.timestamp;
        }
      );
      if (exists) return state;
      return {
        events: [event, ...state.events].slice(0, MAX_EVENTS),
        lastEvent: event,
      };
    }),
  clearEvents: () => set({ events: [], lastEvent: null }),
  getEventsByCategory: (category) => get().events.filter((e) => 'category' in e && e.category === category),
  getEventsByJobId: (jobId) => get().events.filter((e) => 'job_id' in e && e.job_id === jobId),
}));
