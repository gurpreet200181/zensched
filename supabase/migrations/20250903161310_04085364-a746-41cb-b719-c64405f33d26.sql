-- Clean up mock/test data from daily_analytics table
DELETE FROM daily_analytics WHERE user_id IN (
  'f1d41f70-a961-4481-8251-38349b0b12d6', 
  'b6ad1d51-0f37-4b77-ab64-595b6df6b9e7'
);