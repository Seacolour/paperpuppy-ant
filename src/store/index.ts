import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import sessionReducer from './sessionSlice';
import messageReducer from './messageSlice';

const rootReducer = combineReducers({
  sessions: sessionReducer,
  messages: messageReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // 忽略特定路径上的日期对象
        ignoredActionPaths: ['payload.timestamp', 'payload.messages.*.timestamp'],
        ignoredPaths: ['messages.entities.*.timestamp'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 辅助钩子
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// 导入缺少的类型
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; 