'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { REALTIME_SUBSCRIBE_STATES, RealtimeChannel } from '@supabase/supabase-js'
import { useLocalStorageState } from 'ahooks'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { RadioTower, RefreshCwOff, Send, Trash2 } from 'lucide-react'

type Message = {
  type: 'text' | 'image'
  content: string
}

const channelName = '__rts_messages'

export default function RealTimeSharing() {
  const [subscribeStatus, setSubscribeStatus] = useState<`${REALTIME_SUBSCRIBE_STATES}`>()
  const isSubscribed = subscribeStatus === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useLocalStorageState<Message[]>(channelName, { defaultValue: [] })
  const [channel, setChannel] = useState<RealtimeChannel>()

  const send = useCallback(
    (message: Message) => {
      return channel
        ?.send({
          type: 'broadcast',
          event: 'test',
          payload: message,
        })
        .then(() => {
          setMessages(prevState => {
            return [message, ...(prevState?.splice(0, 19) ?? [])]
          })
        })
        .catch(e => {
          console.error(e)
        })
    },
    [channel, setMessages]
  )

  const sendMessage = () => {
    if (!inputText) {
      return
    }
    send({ type: 'text', content: inputText })?.then(() => {
      setInputText('')
    })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        const message: Message = { type: 'image', content: e.target?.result as string }
        send(message)
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      ?.channel(channelName)
      .on('broadcast', { event: 'test' }, ({ payload }) => {
        setMessages(prevState => {
          return [payload as Message, ...(prevState?.splice(0, 19) ?? [])]
        })
      })
      .subscribe((status, err) => {
        setSubscribeStatus(status)
        if (err) {
          console.error(err)
        }
      })
    setChannel(channel)
    return () => {
      if (channel) {
        supabase?.removeChannel(channel)
      }
    }
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        <p className="flex items-center gap-2">
          {isSubscribed ? <RadioTower color="green" /> : <RefreshCwOff color="red" />}
          实时共享
          <span className="text-sm text-muted-foreground">{subscribeStatus}</span>
        </p>
      </h1>
      <div className="mb-4">
        <Textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="输入消息..."
          className="mb-2"
          rows={6}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
        />
        <div className="flex gap-2">
          <Button disabled={!isSubscribed} onClick={sendMessage}>
            发送消息
          </Button>
          <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
          <Button disabled={!isSubscribed}>
            <label htmlFor="image-upload">上传图片</label>
          </Button>
          <Button
            onClick={() => {
              setMessages([])
            }}
            variant="outline"
          >
            清除历史
          </Button>
        </div>
      </div>
      <h2 className="text-xl  mb-4">消息历史</h2>
      <div className="space-y-2">
        {messages?.map((message, index) => (
          <Card key={index}>
            <CardContent className="p-2 group relative">
              <div className="absolute right-2 top-1 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  disabled={!isSubscribed}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    send(message)
                  }}
                >
                  <Send />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setMessages(messages.filter(c => c !== message))
                  }}
                >
                  <Trash2 color="red" className="h-4 w-4" />
                </Button>
              </div>
              {message.type === 'text' ? (
                <p>{message.content}</p>
              ) : (
                <img src={message.content} alt="Shared" className="max-w-[400px] h-auto" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
