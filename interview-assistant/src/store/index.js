import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import candidatesReducer from '../slices/candidatesSlice';
import sessionReducer from '../slices/sessionSlice';

const rootReducer = combineReducers({
  candidates: candidatesReducer,
  session: sessionReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['candidates', 'session'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);