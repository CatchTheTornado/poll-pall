import { BaseApiClient } from "./base-api-client";
import { AgentDTO } from "../dto";
import { ChatInitFormType } from "@/contexts/chat-context";

export type GetAgentsResponse = AgentDTO;
export type PutAgentRequest = AgentDTO;

export type PutAgentResponseSuccess = {
  message: string;
  data: AgentDTO;
  status: 200;
};

export type DeleteAgentResponse = {
  message: string;
  status: 200;
};

export type PutAgentResponseError = {
  message: string;
  status: 400;
  issues?: any[];
};

export type SaveSessionResponse = {
  message: string;
  status: number;
  id?: string
};

export type PutAgentResponse = PutAgentResponseSuccess | PutAgentResponseError;


export class ChatApiClient extends BaseApiClient {
    constructor(databaseIdHash: string, baseUrl?: string) {
      super(baseUrl, databaseIdHash);
    }
    async agent(agentId:string): Promise<GetAgentsResponse> {
      return await (this.request<GetAgentsResponse>('/api/chat/agent/' + encodeURIComponent(agentId) , 'GET') as Promise<GetAgentsResponse>);
    }

    async saveInitForm(sessionId: string, formData: ChatInitFormType): Promise<SaveSessionResponse> {
      return await this.request<SaveSessionResponse>('/api/chat/session/' + encodeURIComponent(sessionId), 'POST', {}, formData) as SaveSessionResponse;
    }

  
}