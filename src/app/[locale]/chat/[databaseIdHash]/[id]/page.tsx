'use client'

import { Chat } from "@/components/chat";
import { ChatInitForm } from "@/components/chat-init-form";
import { useChatContext } from "@/contexts/chat-context";
import { getErrorMessage } from "@/lib/utils";
import { useChat } from "ai/react";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function ChatPage({children,
    params,
  }: {
    children: React.ReactNode;
    params: { id: string, databaseIdHash: string, locale: string };
  }) {
    const chatContext = useChatContext();
    const { t } = useTranslation();
    const { messages, append, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat",
      })
    
    const getSessionHeaders = () => {
        return {
            'Database-Id-Hash': chatContext.databaseIdHash,
            'Agent-Id': chatContext.agent?.id ?? '',
            'Agent-Locale': chatContext.locale,
            'Agent-Session-Id': chatContext.sessionId
        }
    }
    
    useEffect(() => {
        chatContext.init(params.id, params.databaseIdHash, params.locale, nanoid() /** generate session id */).catch((e) => {
          toast.error(getErrorMessage(e));
        });
    }, [params.id, params.databaseIdHash, params.locale]);

    useEffect(() => {
        if (chatContext.agent){
          if(chatContext.initFormRequired && !chatContext.initFormDone){
            return; // wait until user fills the form
          }

          append({
            id: nanoid(),
            role: "user",
            content: t("Lets chat")
          }, {
            headers: getSessionHeaders()
          }).catch((e) => {
            toast.error(getErrorMessage(e));
          });
        }
      }, [chatContext.agent, chatContext.initFormRequired, chatContext.initFormDone]);

    return (
        <div className="pt-10">
            { (chatContext.initFormRequired && !chatContext.initFormDone) ? (
                <ChatInitForm
                    welcomeMessage={chatContext.agent?.options?.welcomeMessage ?? ''}
                   displayName={chatContext.agent?.displayName ?? ''}
                />
            ):(
                <Chat 
                    headers={getSessionHeaders()} 
                    welcomeMessage={chatContext.agent?.options?.welcomeMessage ?? ''}
                    messages={messages}
                    handleInputChange={handleInputChange}
                    isLoading={isLoading}
                    handleSubmit={handleSubmit}
                    input={input}
                    displayName={chatContext.agent?.displayName ?? ''}
                />
            )}
        </div>
    )
}