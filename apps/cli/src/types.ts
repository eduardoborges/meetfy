export interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  startMs?: number;
  endMs?: number;
  accountEmail?: string;
  hangoutLink?: string;
  location?: string;
}

export interface CreateMeetingInput {
  title: string;
  description: string;
  participants: string[];
}
