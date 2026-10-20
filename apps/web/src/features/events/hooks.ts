import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '../../shared/api/query-client';
import type { AddEventMusicianInput, CreateEventInput, EventListFilters, UpdateEventInput, UpdateEventMusicianInput } from '../../shared/types';
import {
  addEventMusician,
  createEvent,
  deleteEvent,
  getEvent,
  getEvents,
  removeEventMusician,
  updateEvent,
  updateEventMusician,
} from './api/events.client';

function invalidateEventQueries(organizationId: string, eventId?: string) {
  queryClient.invalidateQueries({ queryKey: ['events', organizationId] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] });
  if (eventId) queryClient.invalidateQueries({ queryKey: ['event', organizationId, eventId] });
}

export function useEvents(organizationId: string, filters: EventListFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['events', organizationId, filters],
    queryFn: () => getEvents(filters),
    enabled: Boolean(organizationId) && (options.enabled ?? true),
  });
}

export function useEvent(organizationId: string, id: string) {
  return useQuery({
    queryKey: ['event', organizationId, id],
    queryFn: () => getEvent(id),
    enabled: Boolean(organizationId && id),
  });
}

export function useCreateEvent(organizationId: string) {
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEvent(input),
    onSuccess: () => invalidateEventQueries(organizationId),
  });
}

export function useUpdateEvent(organizationId: string) {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEventInput }) => updateEvent(id, input),
    onSuccess: (_data, variables) => invalidateEventQueries(organizationId, variables.id),
  });
}

export function useDeleteEvent(organizationId: string) {
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => invalidateEventQueries(organizationId),
  });
}

export function useAddEventMusician(organizationId: string, eventId: string) {
  return useMutation({
    mutationFn: (input: AddEventMusicianInput) => addEventMusician(eventId, input),
    onSuccess: () => invalidateEventQueries(organizationId, eventId),
  });
}

export function useUpdateEventMusician(organizationId: string) {
  return useMutation({
    mutationFn: ({ eventId, musicianId, input }: { eventId: string; musicianId: string; input: UpdateEventMusicianInput }) =>
      updateEventMusician(eventId, musicianId, input),
    onSuccess: (_data, variables) => invalidateEventQueries(organizationId, variables.eventId),
  });
}

export function useRemoveEventMusician(organizationId: string, eventId: string) {
  return useMutation({
    mutationFn: (musicianId: string) => removeEventMusician(eventId, musicianId),
    onSuccess: () => invalidateEventQueries(organizationId, eventId),
  });
}
