drop extension if exists "pg_net";

revoke delete on table "public"."blocked_rooms" from "anon";

revoke insert on table "public"."blocked_rooms" from "anon";

revoke references on table "public"."blocked_rooms" from "anon";

revoke select on table "public"."blocked_rooms" from "anon";

revoke trigger on table "public"."blocked_rooms" from "anon";

revoke truncate on table "public"."blocked_rooms" from "anon";

revoke update on table "public"."blocked_rooms" from "anon";

revoke delete on table "public"."blocked_rooms" from "authenticated";

revoke insert on table "public"."blocked_rooms" from "authenticated";

revoke references on table "public"."blocked_rooms" from "authenticated";

revoke select on table "public"."blocked_rooms" from "authenticated";

revoke trigger on table "public"."blocked_rooms" from "authenticated";

revoke truncate on table "public"."blocked_rooms" from "authenticated";

revoke update on table "public"."blocked_rooms" from "authenticated";

revoke delete on table "public"."blocked_rooms" from "service_role";

revoke insert on table "public"."blocked_rooms" from "service_role";

revoke references on table "public"."blocked_rooms" from "service_role";

revoke select on table "public"."blocked_rooms" from "service_role";

revoke trigger on table "public"."blocked_rooms" from "service_role";

revoke truncate on table "public"."blocked_rooms" from "service_role";

revoke update on table "public"."blocked_rooms" from "service_role";

revoke delete on table "public"."booking_payment_breakdown" from "anon";

revoke insert on table "public"."booking_payment_breakdown" from "anon";

revoke references on table "public"."booking_payment_breakdown" from "anon";

revoke select on table "public"."booking_payment_breakdown" from "anon";

revoke trigger on table "public"."booking_payment_breakdown" from "anon";

revoke truncate on table "public"."booking_payment_breakdown" from "anon";

revoke update on table "public"."booking_payment_breakdown" from "anon";

revoke delete on table "public"."booking_payment_breakdown" from "authenticated";

revoke insert on table "public"."booking_payment_breakdown" from "authenticated";

revoke references on table "public"."booking_payment_breakdown" from "authenticated";

revoke select on table "public"."booking_payment_breakdown" from "authenticated";

revoke trigger on table "public"."booking_payment_breakdown" from "authenticated";

revoke truncate on table "public"."booking_payment_breakdown" from "authenticated";

revoke update on table "public"."booking_payment_breakdown" from "authenticated";

revoke delete on table "public"."booking_payment_breakdown" from "service_role";

revoke insert on table "public"."booking_payment_breakdown" from "service_role";

revoke references on table "public"."booking_payment_breakdown" from "service_role";

revoke select on table "public"."booking_payment_breakdown" from "service_role";

revoke trigger on table "public"."booking_payment_breakdown" from "service_role";

revoke truncate on table "public"."booking_payment_breakdown" from "service_role";

revoke update on table "public"."booking_payment_breakdown" from "service_role";

revoke delete on table "public"."booking_rooms" from "anon";

revoke insert on table "public"."booking_rooms" from "anon";

revoke references on table "public"."booking_rooms" from "anon";

revoke select on table "public"."booking_rooms" from "anon";

revoke trigger on table "public"."booking_rooms" from "anon";

revoke truncate on table "public"."booking_rooms" from "anon";

revoke update on table "public"."booking_rooms" from "anon";

revoke delete on table "public"."booking_rooms" from "authenticated";

revoke insert on table "public"."booking_rooms" from "authenticated";

revoke references on table "public"."booking_rooms" from "authenticated";

revoke select on table "public"."booking_rooms" from "authenticated";

revoke trigger on table "public"."booking_rooms" from "authenticated";

revoke truncate on table "public"."booking_rooms" from "authenticated";

revoke update on table "public"."booking_rooms" from "authenticated";

revoke delete on table "public"."booking_rooms" from "service_role";

revoke insert on table "public"."booking_rooms" from "service_role";

revoke references on table "public"."booking_rooms" from "service_role";

revoke select on table "public"."booking_rooms" from "service_role";

revoke trigger on table "public"."booking_rooms" from "service_role";

revoke truncate on table "public"."booking_rooms" from "service_role";

revoke update on table "public"."booking_rooms" from "service_role";

revoke delete on table "public"."bookings" from "anon";

revoke insert on table "public"."bookings" from "anon";

revoke references on table "public"."bookings" from "anon";

revoke select on table "public"."bookings" from "anon";

revoke trigger on table "public"."bookings" from "anon";

revoke truncate on table "public"."bookings" from "anon";

revoke update on table "public"."bookings" from "anon";

revoke delete on table "public"."bookings" from "authenticated";

revoke insert on table "public"."bookings" from "authenticated";

revoke references on table "public"."bookings" from "authenticated";

revoke select on table "public"."bookings" from "authenticated";

revoke trigger on table "public"."bookings" from "authenticated";

revoke truncate on table "public"."bookings" from "authenticated";

revoke update on table "public"."bookings" from "authenticated";

revoke delete on table "public"."bookings" from "service_role";

revoke insert on table "public"."bookings" from "service_role";

revoke references on table "public"."bookings" from "service_role";

revoke select on table "public"."bookings" from "service_role";

revoke trigger on table "public"."bookings" from "service_role";

revoke truncate on table "public"."bookings" from "service_role";

revoke update on table "public"."bookings" from "service_role";

revoke delete on table "public"."cancelled_bookings" from "anon";

revoke insert on table "public"."cancelled_bookings" from "anon";

revoke references on table "public"."cancelled_bookings" from "anon";

revoke select on table "public"."cancelled_bookings" from "anon";

revoke trigger on table "public"."cancelled_bookings" from "anon";

revoke truncate on table "public"."cancelled_bookings" from "anon";

revoke update on table "public"."cancelled_bookings" from "anon";

revoke delete on table "public"."cancelled_bookings" from "authenticated";

revoke insert on table "public"."cancelled_bookings" from "authenticated";

revoke references on table "public"."cancelled_bookings" from "authenticated";

revoke select on table "public"."cancelled_bookings" from "authenticated";

revoke trigger on table "public"."cancelled_bookings" from "authenticated";

revoke truncate on table "public"."cancelled_bookings" from "authenticated";

revoke update on table "public"."cancelled_bookings" from "authenticated";

revoke delete on table "public"."cancelled_bookings" from "service_role";

revoke insert on table "public"."cancelled_bookings" from "service_role";

revoke references on table "public"."cancelled_bookings" from "service_role";

revoke select on table "public"."cancelled_bookings" from "service_role";

revoke trigger on table "public"."cancelled_bookings" from "service_role";

revoke truncate on table "public"."cancelled_bookings" from "service_role";

revoke update on table "public"."cancelled_bookings" from "service_role";

revoke delete on table "public"."chat_history" from "anon";

revoke insert on table "public"."chat_history" from "anon";

revoke references on table "public"."chat_history" from "anon";

revoke select on table "public"."chat_history" from "anon";

revoke trigger on table "public"."chat_history" from "anon";

revoke truncate on table "public"."chat_history" from "anon";

revoke update on table "public"."chat_history" from "anon";

revoke delete on table "public"."chat_history" from "authenticated";

revoke insert on table "public"."chat_history" from "authenticated";

revoke references on table "public"."chat_history" from "authenticated";

revoke select on table "public"."chat_history" from "authenticated";

revoke trigger on table "public"."chat_history" from "authenticated";

revoke truncate on table "public"."chat_history" from "authenticated";

revoke update on table "public"."chat_history" from "authenticated";

revoke delete on table "public"."chat_history" from "service_role";

revoke insert on table "public"."chat_history" from "service_role";

revoke references on table "public"."chat_history" from "service_role";

revoke select on table "public"."chat_history" from "service_role";

revoke trigger on table "public"."chat_history" from "service_role";

revoke truncate on table "public"."chat_history" from "service_role";

revoke update on table "public"."chat_history" from "service_role";

revoke delete on table "public"."checkout_notifications" from "anon";

revoke insert on table "public"."checkout_notifications" from "anon";

revoke references on table "public"."checkout_notifications" from "anon";

revoke select on table "public"."checkout_notifications" from "anon";

revoke trigger on table "public"."checkout_notifications" from "anon";

revoke truncate on table "public"."checkout_notifications" from "anon";

revoke update on table "public"."checkout_notifications" from "anon";

revoke delete on table "public"."checkout_notifications" from "authenticated";

revoke insert on table "public"."checkout_notifications" from "authenticated";

revoke references on table "public"."checkout_notifications" from "authenticated";

revoke select on table "public"."checkout_notifications" from "authenticated";

revoke trigger on table "public"."checkout_notifications" from "authenticated";

revoke truncate on table "public"."checkout_notifications" from "authenticated";

revoke update on table "public"."checkout_notifications" from "authenticated";

revoke delete on table "public"."checkout_notifications" from "service_role";

revoke insert on table "public"."checkout_notifications" from "service_role";

revoke references on table "public"."checkout_notifications" from "service_role";

revoke select on table "public"."checkout_notifications" from "service_role";

revoke trigger on table "public"."checkout_notifications" from "service_role";

revoke truncate on table "public"."checkout_notifications" from "service_role";

revoke update on table "public"."checkout_notifications" from "service_role";

revoke delete on table "public"."grace_period_tracker" from "anon";

revoke insert on table "public"."grace_period_tracker" from "anon";

revoke references on table "public"."grace_period_tracker" from "anon";

revoke select on table "public"."grace_period_tracker" from "anon";

revoke trigger on table "public"."grace_period_tracker" from "anon";

revoke truncate on table "public"."grace_period_tracker" from "anon";

revoke update on table "public"."grace_period_tracker" from "anon";

revoke delete on table "public"."grace_period_tracker" from "authenticated";

revoke insert on table "public"."grace_period_tracker" from "authenticated";

revoke references on table "public"."grace_period_tracker" from "authenticated";

revoke select on table "public"."grace_period_tracker" from "authenticated";

revoke trigger on table "public"."grace_period_tracker" from "authenticated";

revoke truncate on table "public"."grace_period_tracker" from "authenticated";

revoke update on table "public"."grace_period_tracker" from "authenticated";

revoke delete on table "public"."grace_period_tracker" from "service_role";

revoke insert on table "public"."grace_period_tracker" from "service_role";

revoke references on table "public"."grace_period_tracker" from "service_role";

revoke select on table "public"."grace_period_tracker" from "service_role";

revoke trigger on table "public"."grace_period_tracker" from "service_role";

revoke truncate on table "public"."grace_period_tracker" from "service_role";

revoke update on table "public"."grace_period_tracker" from "service_role";

revoke delete on table "public"."guest_communications" from "anon";

revoke insert on table "public"."guest_communications" from "anon";

revoke references on table "public"."guest_communications" from "anon";

revoke select on table "public"."guest_communications" from "anon";

revoke trigger on table "public"."guest_communications" from "anon";

revoke truncate on table "public"."guest_communications" from "anon";

revoke update on table "public"."guest_communications" from "anon";

revoke delete on table "public"."guest_communications" from "authenticated";

revoke insert on table "public"."guest_communications" from "authenticated";

revoke references on table "public"."guest_communications" from "authenticated";

revoke select on table "public"."guest_communications" from "authenticated";

revoke trigger on table "public"."guest_communications" from "authenticated";

revoke truncate on table "public"."guest_communications" from "authenticated";

revoke update on table "public"."guest_communications" from "authenticated";

revoke delete on table "public"."guest_communications" from "service_role";

revoke insert on table "public"."guest_communications" from "service_role";

revoke references on table "public"."guest_communications" from "service_role";

revoke select on table "public"."guest_communications" from "service_role";

revoke trigger on table "public"."guest_communications" from "service_role";

revoke truncate on table "public"."guest_communications" from "service_role";

revoke update on table "public"."guest_communications" from "service_role";

revoke delete on table "public"."guest_documents" from "anon";

revoke insert on table "public"."guest_documents" from "anon";

revoke references on table "public"."guest_documents" from "anon";

revoke select on table "public"."guest_documents" from "anon";

revoke trigger on table "public"."guest_documents" from "anon";

revoke truncate on table "public"."guest_documents" from "anon";

revoke update on table "public"."guest_documents" from "anon";

revoke delete on table "public"."guest_documents" from "authenticated";

revoke insert on table "public"."guest_documents" from "authenticated";

revoke references on table "public"."guest_documents" from "authenticated";

revoke select on table "public"."guest_documents" from "authenticated";

revoke trigger on table "public"."guest_documents" from "authenticated";

revoke truncate on table "public"."guest_documents" from "authenticated";

revoke update on table "public"."guest_documents" from "authenticated";

revoke delete on table "public"."guest_documents" from "service_role";

revoke insert on table "public"."guest_documents" from "service_role";

revoke references on table "public"."guest_documents" from "service_role";

revoke select on table "public"."guest_documents" from "service_role";

revoke trigger on table "public"."guest_documents" from "service_role";

revoke truncate on table "public"."guest_documents" from "service_role";

revoke update on table "public"."guest_documents" from "service_role";

revoke delete on table "public"."guest_feedback" from "anon";

revoke insert on table "public"."guest_feedback" from "anon";

revoke references on table "public"."guest_feedback" from "anon";

revoke select on table "public"."guest_feedback" from "anon";

revoke trigger on table "public"."guest_feedback" from "anon";

revoke truncate on table "public"."guest_feedback" from "anon";

revoke update on table "public"."guest_feedback" from "anon";

revoke delete on table "public"."guest_feedback" from "authenticated";

revoke insert on table "public"."guest_feedback" from "authenticated";

revoke references on table "public"."guest_feedback" from "authenticated";

revoke select on table "public"."guest_feedback" from "authenticated";

revoke trigger on table "public"."guest_feedback" from "authenticated";

revoke truncate on table "public"."guest_feedback" from "authenticated";

revoke update on table "public"."guest_feedback" from "authenticated";

revoke delete on table "public"."guest_feedback" from "service_role";

revoke insert on table "public"."guest_feedback" from "service_role";

revoke references on table "public"."guest_feedback" from "service_role";

revoke select on table "public"."guest_feedback" from "service_role";

revoke trigger on table "public"."guest_feedback" from "service_role";

revoke truncate on table "public"."guest_feedback" from "service_role";

revoke update on table "public"."guest_feedback" from "service_role";

revoke delete on table "public"."guest_loyalty" from "anon";

revoke insert on table "public"."guest_loyalty" from "anon";

revoke references on table "public"."guest_loyalty" from "anon";

revoke select on table "public"."guest_loyalty" from "anon";

revoke trigger on table "public"."guest_loyalty" from "anon";

revoke truncate on table "public"."guest_loyalty" from "anon";

revoke update on table "public"."guest_loyalty" from "anon";

revoke delete on table "public"."guest_loyalty" from "authenticated";

revoke insert on table "public"."guest_loyalty" from "authenticated";

revoke references on table "public"."guest_loyalty" from "authenticated";

revoke select on table "public"."guest_loyalty" from "authenticated";

revoke trigger on table "public"."guest_loyalty" from "authenticated";

revoke truncate on table "public"."guest_loyalty" from "authenticated";

revoke update on table "public"."guest_loyalty" from "authenticated";

revoke delete on table "public"."guest_loyalty" from "service_role";

revoke insert on table "public"."guest_loyalty" from "service_role";

revoke references on table "public"."guest_loyalty" from "service_role";

revoke select on table "public"."guest_loyalty" from "service_role";

revoke trigger on table "public"."guest_loyalty" from "service_role";

revoke truncate on table "public"."guest_loyalty" from "service_role";

revoke update on table "public"."guest_loyalty" from "service_role";

revoke delete on table "public"."guest_preferences" from "anon";

revoke insert on table "public"."guest_preferences" from "anon";

revoke references on table "public"."guest_preferences" from "anon";

revoke select on table "public"."guest_preferences" from "anon";

revoke trigger on table "public"."guest_preferences" from "anon";

revoke truncate on table "public"."guest_preferences" from "anon";

revoke update on table "public"."guest_preferences" from "anon";

revoke delete on table "public"."guest_preferences" from "authenticated";

revoke insert on table "public"."guest_preferences" from "authenticated";

revoke references on table "public"."guest_preferences" from "authenticated";

revoke select on table "public"."guest_preferences" from "authenticated";

revoke trigger on table "public"."guest_preferences" from "authenticated";

revoke truncate on table "public"."guest_preferences" from "authenticated";

revoke update on table "public"."guest_preferences" from "authenticated";

revoke delete on table "public"."guest_preferences" from "service_role";

revoke insert on table "public"."guest_preferences" from "service_role";

revoke references on table "public"."guest_preferences" from "service_role";

revoke select on table "public"."guest_preferences" from "service_role";

revoke trigger on table "public"."guest_preferences" from "service_role";

revoke truncate on table "public"."guest_preferences" from "service_role";

revoke update on table "public"."guest_preferences" from "service_role";

revoke delete on table "public"."guest_special_requests" from "anon";

revoke insert on table "public"."guest_special_requests" from "anon";

revoke references on table "public"."guest_special_requests" from "anon";

revoke select on table "public"."guest_special_requests" from "anon";

revoke trigger on table "public"."guest_special_requests" from "anon";

revoke truncate on table "public"."guest_special_requests" from "anon";

revoke update on table "public"."guest_special_requests" from "anon";

revoke delete on table "public"."guest_special_requests" from "authenticated";

revoke insert on table "public"."guest_special_requests" from "authenticated";

revoke references on table "public"."guest_special_requests" from "authenticated";

revoke select on table "public"."guest_special_requests" from "authenticated";

revoke trigger on table "public"."guest_special_requests" from "authenticated";

revoke truncate on table "public"."guest_special_requests" from "authenticated";

revoke update on table "public"."guest_special_requests" from "authenticated";

revoke delete on table "public"."guest_special_requests" from "service_role";

revoke insert on table "public"."guest_special_requests" from "service_role";

revoke references on table "public"."guest_special_requests" from "service_role";

revoke select on table "public"."guest_special_requests" from "service_role";

revoke trigger on table "public"."guest_special_requests" from "service_role";

revoke truncate on table "public"."guest_special_requests" from "service_role";

revoke update on table "public"."guest_special_requests" from "service_role";

revoke delete on table "public"."guest_visits" from "anon";

revoke insert on table "public"."guest_visits" from "anon";

revoke references on table "public"."guest_visits" from "anon";

revoke select on table "public"."guest_visits" from "anon";

revoke trigger on table "public"."guest_visits" from "anon";

revoke truncate on table "public"."guest_visits" from "anon";

revoke update on table "public"."guest_visits" from "anon";

revoke delete on table "public"."guest_visits" from "authenticated";

revoke insert on table "public"."guest_visits" from "authenticated";

revoke references on table "public"."guest_visits" from "authenticated";

revoke select on table "public"."guest_visits" from "authenticated";

revoke trigger on table "public"."guest_visits" from "authenticated";

revoke truncate on table "public"."guest_visits" from "authenticated";

revoke update on table "public"."guest_visits" from "authenticated";

revoke delete on table "public"."guest_visits" from "service_role";

revoke insert on table "public"."guest_visits" from "service_role";

revoke references on table "public"."guest_visits" from "service_role";

revoke select on table "public"."guest_visits" from "service_role";

revoke trigger on table "public"."guest_visits" from "service_role";

revoke truncate on table "public"."guest_visits" from "service_role";

revoke update on table "public"."guest_visits" from "service_role";

revoke delete on table "public"."guests" from "anon";

revoke insert on table "public"."guests" from "anon";

revoke references on table "public"."guests" from "anon";

revoke select on table "public"."guests" from "anon";

revoke trigger on table "public"."guests" from "anon";

revoke truncate on table "public"."guests" from "anon";

revoke update on table "public"."guests" from "anon";

revoke delete on table "public"."guests" from "authenticated";

revoke insert on table "public"."guests" from "authenticated";

revoke references on table "public"."guests" from "authenticated";

revoke select on table "public"."guests" from "authenticated";

revoke trigger on table "public"."guests" from "authenticated";

revoke truncate on table "public"."guests" from "authenticated";

revoke update on table "public"."guests" from "authenticated";

revoke delete on table "public"."guests" from "service_role";

revoke insert on table "public"."guests" from "service_role";

revoke references on table "public"."guests" from "service_role";

revoke select on table "public"."guests" from "service_role";

revoke trigger on table "public"."guests" from "service_role";

revoke truncate on table "public"."guests" from "service_role";

revoke update on table "public"."guests" from "service_role";

revoke delete on table "public"."hotels" from "anon";

revoke insert on table "public"."hotels" from "anon";

revoke references on table "public"."hotels" from "anon";

revoke select on table "public"."hotels" from "anon";

revoke trigger on table "public"."hotels" from "anon";

revoke truncate on table "public"."hotels" from "anon";

revoke update on table "public"."hotels" from "anon";

revoke delete on table "public"."hotels" from "authenticated";

revoke insert on table "public"."hotels" from "authenticated";

revoke references on table "public"."hotels" from "authenticated";

revoke select on table "public"."hotels" from "authenticated";

revoke trigger on table "public"."hotels" from "authenticated";

revoke truncate on table "public"."hotels" from "authenticated";

revoke update on table "public"."hotels" from "authenticated";

revoke delete on table "public"."hotels" from "service_role";

revoke insert on table "public"."hotels" from "service_role";

revoke references on table "public"."hotels" from "service_role";

revoke select on table "public"."hotels" from "service_role";

revoke trigger on table "public"."hotels" from "service_role";

revoke truncate on table "public"."hotels" from "service_role";

revoke update on table "public"."hotels" from "service_role";

revoke delete on table "public"."housekeeping_tasks" from "anon";

revoke insert on table "public"."housekeeping_tasks" from "anon";

revoke references on table "public"."housekeeping_tasks" from "anon";

revoke select on table "public"."housekeeping_tasks" from "anon";

revoke trigger on table "public"."housekeeping_tasks" from "anon";

revoke truncate on table "public"."housekeeping_tasks" from "anon";

revoke update on table "public"."housekeeping_tasks" from "anon";

revoke delete on table "public"."housekeeping_tasks" from "authenticated";

revoke insert on table "public"."housekeeping_tasks" from "authenticated";

revoke references on table "public"."housekeeping_tasks" from "authenticated";

revoke select on table "public"."housekeeping_tasks" from "authenticated";

revoke trigger on table "public"."housekeeping_tasks" from "authenticated";

revoke truncate on table "public"."housekeeping_tasks" from "authenticated";

revoke update on table "public"."housekeeping_tasks" from "authenticated";

revoke delete on table "public"."housekeeping_tasks" from "service_role";

revoke insert on table "public"."housekeeping_tasks" from "service_role";

revoke references on table "public"."housekeeping_tasks" from "service_role";

revoke select on table "public"."housekeeping_tasks" from "service_role";

revoke trigger on table "public"."housekeeping_tasks" from "service_role";

revoke truncate on table "public"."housekeeping_tasks" from "service_role";

revoke update on table "public"."housekeeping_tasks" from "service_role";

revoke delete on table "public"."late_checkout_charges" from "anon";

revoke insert on table "public"."late_checkout_charges" from "anon";

revoke references on table "public"."late_checkout_charges" from "anon";

revoke select on table "public"."late_checkout_charges" from "anon";

revoke trigger on table "public"."late_checkout_charges" from "anon";

revoke truncate on table "public"."late_checkout_charges" from "anon";

revoke update on table "public"."late_checkout_charges" from "anon";

revoke delete on table "public"."late_checkout_charges" from "authenticated";

revoke insert on table "public"."late_checkout_charges" from "authenticated";

revoke references on table "public"."late_checkout_charges" from "authenticated";

revoke select on table "public"."late_checkout_charges" from "authenticated";

revoke trigger on table "public"."late_checkout_charges" from "authenticated";

revoke truncate on table "public"."late_checkout_charges" from "authenticated";

revoke update on table "public"."late_checkout_charges" from "authenticated";

revoke delete on table "public"."late_checkout_charges" from "service_role";

revoke insert on table "public"."late_checkout_charges" from "service_role";

revoke references on table "public"."late_checkout_charges" from "service_role";

revoke select on table "public"."late_checkout_charges" from "service_role";

revoke trigger on table "public"."late_checkout_charges" from "service_role";

revoke truncate on table "public"."late_checkout_charges" from "service_role";

revoke update on table "public"."late_checkout_charges" from "service_role";

revoke delete on table "public"."payment_transactions" from "anon";

revoke insert on table "public"."payment_transactions" from "anon";

revoke references on table "public"."payment_transactions" from "anon";

revoke select on table "public"."payment_transactions" from "anon";

revoke trigger on table "public"."payment_transactions" from "anon";

revoke truncate on table "public"."payment_transactions" from "anon";

revoke update on table "public"."payment_transactions" from "anon";

revoke delete on table "public"."payment_transactions" from "authenticated";

revoke insert on table "public"."payment_transactions" from "authenticated";

revoke references on table "public"."payment_transactions" from "authenticated";

revoke select on table "public"."payment_transactions" from "authenticated";

revoke trigger on table "public"."payment_transactions" from "authenticated";

revoke truncate on table "public"."payment_transactions" from "authenticated";

revoke update on table "public"."payment_transactions" from "authenticated";

revoke delete on table "public"."payment_transactions" from "service_role";

revoke insert on table "public"."payment_transactions" from "service_role";

revoke references on table "public"."payment_transactions" from "service_role";

revoke select on table "public"."payment_transactions" from "service_role";

revoke trigger on table "public"."payment_transactions" from "service_role";

revoke truncate on table "public"."payment_transactions" from "service_role";

revoke update on table "public"."payment_transactions" from "service_role";

revoke delete on table "public"."reservations" from "anon";

revoke insert on table "public"."reservations" from "anon";

revoke references on table "public"."reservations" from "anon";

revoke select on table "public"."reservations" from "anon";

revoke trigger on table "public"."reservations" from "anon";

revoke truncate on table "public"."reservations" from "anon";

revoke update on table "public"."reservations" from "anon";

revoke delete on table "public"."reservations" from "authenticated";

revoke insert on table "public"."reservations" from "authenticated";

revoke references on table "public"."reservations" from "authenticated";

revoke select on table "public"."reservations" from "authenticated";

revoke trigger on table "public"."reservations" from "authenticated";

revoke truncate on table "public"."reservations" from "authenticated";

revoke update on table "public"."reservations" from "authenticated";

revoke delete on table "public"."reservations" from "service_role";

revoke insert on table "public"."reservations" from "service_role";

revoke references on table "public"."reservations" from "service_role";

revoke select on table "public"."reservations" from "service_role";

revoke trigger on table "public"."reservations" from "service_role";

revoke truncate on table "public"."reservations" from "service_role";

revoke update on table "public"."reservations" from "service_role";

revoke delete on table "public"."room_transfers" from "anon";

revoke insert on table "public"."room_transfers" from "anon";

revoke references on table "public"."room_transfers" from "anon";

revoke select on table "public"."room_transfers" from "anon";

revoke trigger on table "public"."room_transfers" from "anon";

revoke truncate on table "public"."room_transfers" from "anon";

revoke update on table "public"."room_transfers" from "anon";

revoke delete on table "public"."room_transfers" from "authenticated";

revoke insert on table "public"."room_transfers" from "authenticated";

revoke references on table "public"."room_transfers" from "authenticated";

revoke select on table "public"."room_transfers" from "authenticated";

revoke trigger on table "public"."room_transfers" from "authenticated";

revoke truncate on table "public"."room_transfers" from "authenticated";

revoke update on table "public"."room_transfers" from "authenticated";

revoke delete on table "public"."room_transfers" from "service_role";

revoke insert on table "public"."room_transfers" from "service_role";

revoke references on table "public"."room_transfers" from "service_role";

revoke select on table "public"."room_transfers" from "service_role";

revoke trigger on table "public"."room_transfers" from "service_role";

revoke truncate on table "public"."room_transfers" from "service_role";

revoke update on table "public"."room_transfers" from "service_role";

revoke delete on table "public"."room_types" from "anon";

revoke insert on table "public"."room_types" from "anon";

revoke references on table "public"."room_types" from "anon";

revoke select on table "public"."room_types" from "anon";

revoke trigger on table "public"."room_types" from "anon";

revoke truncate on table "public"."room_types" from "anon";

revoke update on table "public"."room_types" from "anon";

revoke delete on table "public"."room_types" from "authenticated";

revoke insert on table "public"."room_types" from "authenticated";

revoke references on table "public"."room_types" from "authenticated";

revoke select on table "public"."room_types" from "authenticated";

revoke trigger on table "public"."room_types" from "authenticated";

revoke truncate on table "public"."room_types" from "authenticated";

revoke update on table "public"."room_types" from "authenticated";

revoke delete on table "public"."room_types" from "service_role";

revoke insert on table "public"."room_types" from "service_role";

revoke references on table "public"."room_types" from "service_role";

revoke select on table "public"."room_types" from "service_role";

revoke trigger on table "public"."room_types" from "service_role";

revoke truncate on table "public"."room_types" from "service_role";

revoke update on table "public"."room_types" from "service_role";

revoke delete on table "public"."rooms" from "anon";

revoke insert on table "public"."rooms" from "anon";

revoke references on table "public"."rooms" from "anon";

revoke select on table "public"."rooms" from "anon";

revoke trigger on table "public"."rooms" from "anon";

revoke truncate on table "public"."rooms" from "anon";

revoke update on table "public"."rooms" from "anon";

revoke delete on table "public"."rooms" from "authenticated";

revoke insert on table "public"."rooms" from "authenticated";

revoke references on table "public"."rooms" from "authenticated";

revoke select on table "public"."rooms" from "authenticated";

revoke trigger on table "public"."rooms" from "authenticated";

revoke truncate on table "public"."rooms" from "authenticated";

revoke update on table "public"."rooms" from "authenticated";

revoke delete on table "public"."rooms" from "service_role";

revoke insert on table "public"."rooms" from "service_role";

revoke references on table "public"."rooms" from "service_role";

revoke select on table "public"."rooms" from "service_role";

revoke trigger on table "public"."rooms" from "service_role";

revoke truncate on table "public"."rooms" from "service_role";

revoke update on table "public"."rooms" from "service_role";

revoke delete on table "public"."settings" from "anon";

revoke insert on table "public"."settings" from "anon";

revoke references on table "public"."settings" from "anon";

revoke select on table "public"."settings" from "anon";

revoke trigger on table "public"."settings" from "anon";

revoke truncate on table "public"."settings" from "anon";

revoke update on table "public"."settings" from "anon";

revoke delete on table "public"."settings" from "authenticated";

revoke insert on table "public"."settings" from "authenticated";

revoke references on table "public"."settings" from "authenticated";

revoke select on table "public"."settings" from "authenticated";

revoke trigger on table "public"."settings" from "authenticated";

revoke truncate on table "public"."settings" from "authenticated";

revoke update on table "public"."settings" from "authenticated";

revoke delete on table "public"."settings" from "service_role";

revoke insert on table "public"."settings" from "service_role";

revoke references on table "public"."settings" from "service_role";

revoke select on table "public"."settings" from "service_role";

revoke trigger on table "public"."settings" from "service_role";

revoke truncate on table "public"."settings" from "service_role";

revoke update on table "public"."settings" from "service_role";

revoke delete on table "public"."staff" from "anon";

revoke insert on table "public"."staff" from "anon";

revoke references on table "public"."staff" from "anon";

revoke select on table "public"."staff" from "anon";

revoke trigger on table "public"."staff" from "anon";

revoke truncate on table "public"."staff" from "anon";

revoke update on table "public"."staff" from "anon";

revoke delete on table "public"."staff" from "authenticated";

revoke insert on table "public"."staff" from "authenticated";

revoke references on table "public"."staff" from "authenticated";

revoke select on table "public"."staff" from "authenticated";

revoke trigger on table "public"."staff" from "authenticated";

revoke truncate on table "public"."staff" from "authenticated";

revoke update on table "public"."staff" from "authenticated";

revoke delete on table "public"."staff" from "service_role";

revoke insert on table "public"."staff" from "service_role";

revoke references on table "public"."staff" from "service_role";

revoke select on table "public"."staff" from "service_role";

revoke trigger on table "public"."staff" from "service_role";

revoke truncate on table "public"."staff" from "service_role";

revoke update on table "public"."staff" from "service_role";

revoke delete on table "public"."staff_logs" from "anon";

revoke insert on table "public"."staff_logs" from "anon";

revoke references on table "public"."staff_logs" from "anon";

revoke select on table "public"."staff_logs" from "anon";

revoke trigger on table "public"."staff_logs" from "anon";

revoke truncate on table "public"."staff_logs" from "anon";

revoke update on table "public"."staff_logs" from "anon";

revoke delete on table "public"."staff_logs" from "authenticated";

revoke insert on table "public"."staff_logs" from "authenticated";

revoke references on table "public"."staff_logs" from "authenticated";

revoke select on table "public"."staff_logs" from "authenticated";

revoke trigger on table "public"."staff_logs" from "authenticated";

revoke truncate on table "public"."staff_logs" from "authenticated";

revoke update on table "public"."staff_logs" from "authenticated";

revoke delete on table "public"."staff_logs" from "service_role";

revoke insert on table "public"."staff_logs" from "service_role";

revoke references on table "public"."staff_logs" from "service_role";

revoke select on table "public"."staff_logs" from "service_role";

revoke trigger on table "public"."staff_logs" from "service_role";

revoke truncate on table "public"."staff_logs" from "service_role";

revoke update on table "public"."staff_logs" from "service_role";

alter table "public"."checkout_notifications" drop constraint "checkout_notifications_notification_type_check";

alter table "public"."payment_transactions" drop constraint "payment_transactions_type_check";

alter table "public"."blocked_rooms" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."booking_rooms" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."bookings" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."cancelled_bookings" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."chat_history" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."guests" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."hotels" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."housekeeping_tasks" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."payment_transactions" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."reservations" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."room_types" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."rooms" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."settings" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."staff" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."staff_logs" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."checkout_notifications" add constraint "checkout_notifications_notification_type_check" CHECK (((notification_type)::text = ANY ((ARRAY['approaching'::character varying, 'overdue'::character varying, 'grace_period'::character varying, 'late_charges'::character varying])::text[]))) not valid;

alter table "public"."checkout_notifications" validate constraint "checkout_notifications_notification_type_check";

alter table "public"."payment_transactions" add constraint "payment_transactions_type_check" CHECK ((lower((transaction_type)::text) = ANY (ARRAY['advance'::text, 'receipt'::text]))) NOT VALID not valid;

alter table "public"."payment_transactions" validate constraint "payment_transactions_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_payment_transaction(p_booking_id uuid, p_amount numeric, p_payment_method character varying, p_transaction_type character varying, p_collected_by uuid DEFAULT NULL::uuid, p_reference_number character varying DEFAULT NULL::character varying, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    transaction_id UUID;
BEGIN
    -- Insert payment transaction
    INSERT INTO payment_transactions (
        booking_id,
        amount,
        payment_method,
        transaction_type,
        collected_by,
        reference_number,
        notes
    ) VALUES (
        p_booking_id,
        p_amount,
        p_payment_method,
        p_transaction_type,
        p_collected_by,
        p_reference_number,
        p_notes
    ) RETURNING id INTO transaction_id;
    
    -- Log the payment collection
    IF p_collected_by IS NOT NULL THEN
        INSERT INTO staff_logs (
            hotel_id,
            staff_id,
            action,
            details,
            ip_address
        ) VALUES (
            '550e8400-e29b-41d4-a716-446655440000',
            p_collected_by,
            'payment_collected',
            format('Collected %s payment of ₹%s via %s for booking %s', 
                   p_transaction_type, p_amount, p_payment_method, p_booking_id)
        );
    END IF;
    
    RETURN transaction_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.block_room(p_room_id uuid, p_blocked_by_staff_id uuid, p_blocked_from_date date, p_blocked_to_date date, p_reason text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_blocked_room_id uuid;
  v_room_exists boolean;
  v_conflicting_block boolean;
BEGIN
  -- Check if room exists
  SELECT EXISTS(
    SELECT 1 FROM public.rooms 
    WHERE id = p_room_id
  ) INTO v_room_exists;
  
  IF NOT v_room_exists THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  -- Check for conflicting active blocks
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_rooms 
    WHERE room_id = p_room_id 
    AND is_active = true
    AND (
      (blocked_from_date <= p_blocked_from_date AND blocked_to_date > p_blocked_from_date) OR
      (blocked_from_date < p_blocked_to_date AND blocked_to_date >= p_blocked_to_date) OR
      (blocked_from_date >= p_blocked_from_date AND blocked_to_date <= p_blocked_to_date)
    )
  ) INTO v_conflicting_block;
  
  IF v_conflicting_block THEN
    RAISE EXCEPTION 'Room is already blocked for the specified date range';
  END IF;
  
  -- Create blocking record
  INSERT INTO public.blocked_rooms (
    room_id,
    blocked_by_staff_id,
    blocked_from_date,
    blocked_to_date,
    reason,
    notes
  ) VALUES (
    p_room_id,
    p_blocked_by_staff_id,
    p_blocked_from_date,
    p_blocked_to_date,
    p_reason,
    p_notes
  ) RETURNING id INTO v_blocked_room_id;
  
  -- Update room status to blocked
  UPDATE public.rooms 
  SET 
    status = 'blocked',
    updated_at = now()
  WHERE id = p_room_id;
  
  RETURN v_blocked_room_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_loyalty_points(amount numeric)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1 point per 100 currency units spent
    RETURN FLOOR(amount / 100);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_remaining_balance(booking_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  remaining numeric(10,2) := 0;
  total numeric(10,2) := 0;
  total_paid numeric(10,2) := 0;
BEGIN
  SELECT COALESCE(total_amount,0) INTO total FROM public.booking_payment_breakdown WHERE booking_id = booking_uuid;
  IF total IS NULL THEN total := 0; END IF;

  SELECT COALESCE(SUM(amount),0) INTO total_paid
  FROM public.payment_transactions
  WHERE booking_id = booking_uuid AND status = 'completed' AND transaction_type IN ('advance','receipt');

  remaining := GREATEST(total - total_paid, 0);
  RETURN remaining;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_cancellation_reason text, p_cancelled_by_staff_id uuid DEFAULT NULL::uuid, p_refund_amount numeric DEFAULT 0, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_cancelled_booking_id uuid;
  v_booking_exists boolean;
BEGIN
  -- Check if booking exists and is not already cancelled
  SELECT EXISTS(
    SELECT 1 FROM public.bookings 
    WHERE id = p_booking_id AND status != 'cancelled'
  ) INTO v_booking_exists;
  
  IF NOT v_booking_exists THEN
    RAISE EXCEPTION 'Booking not found or already cancelled';
  END IF;
  
  -- Update booking status and cancellation details
  UPDATE public.bookings 
  SET 
    status = 'cancelled',
    cancellation_reason = p_cancellation_reason,
    cancel_date = now(),
    cancelled_by_staff_id = p_cancelled_by_staff_id,
    updated_at = now()
  WHERE id = p_booking_id;
  
  -- Create detailed cancellation record
  INSERT INTO public.cancelled_bookings (
    booking_id,
    cancellation_reason,
    cancel_date,
    cancelled_by_staff_id,
    refund_amount,
    notes
  ) VALUES (
    p_booking_id,
    p_cancellation_reason,
    now(),
    p_cancelled_by_staff_id,
    p_refund_amount,
    p_notes
  ) RETURNING id INTO v_cancelled_booking_id;
  
  -- Update room statuses to cancelled
  UPDATE public.booking_rooms 
  SET 
    room_status = 'cancelled',
    updated_at = now()
  WHERE booking_id = p_booking_id;
  
  RETURN v_cancelled_booking_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_checkout_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Archive notifications older than 30 days
    UPDATE checkout_notifications 
    SET is_active = false 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_active = true;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up old checkout notifications';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_booking_nights()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  planned_diff integer;
  actual_seconds numeric;
  actual_days numeric;
  actual_ceiled integer;
BEGIN
  -- Compute planned_nights when both dates are present
  IF NEW.check_in IS NOT NULL AND NEW.expected_checkout IS NOT NULL THEN
    planned_diff := (NEW.expected_checkout - NEW.check_in);
    IF planned_diff < 0 THEN
      NEW.planned_nights := 0;
    ELSE
      IF NEW.status = 'cancelled' THEN
        NEW.planned_nights := NULL;
      ELSE
        NEW.planned_nights := GREATEST(planned_diff, 1);
      END IF;
    END IF;
  ELSE
    NEW.planned_nights := NULL;
  END IF;

  -- Compute actual_nights when both timestamps are present
  IF NEW.actual_check_in IS NOT NULL AND NEW.actual_check_out IS NOT NULL THEN
    actual_seconds := EXTRACT(EPOCH FROM (NEW.actual_check_out - NEW.actual_check_in));
    IF actual_seconds IS NULL OR actual_seconds <= 0 THEN
      NEW.actual_nights := 0;
    ELSE
      actual_days := actual_seconds / 86400.0;
      actual_ceiled := CEIL(actual_days);
      IF NEW.status = 'cancelled' THEN
        NEW.actual_nights := NULL;
      ELSE
        NEW.actual_nights := GREATEST(actual_ceiled, 1);
      END IF;
    END IF;
  ELSE
    NEW.actual_nights := NULL;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_total_pax()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Compute total_pax when any pax field changes
  NEW.total_pax := COALESCE(NEW.number_of_guests, 0) + 
                   COALESCE(NEW.extra_guests, 0) + 
                   COALESCE(NEW.child_guests, 0);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_blocked_room_stats(p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT NULL::date)
 RETURNS TABLE(total_blocked bigint, currently_blocked bigint, blocked_by_staff jsonb, blocked_by_reason jsonb, avg_block_duration numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_blocked,
    COUNT(*) FILTER (WHERE is_active = true) as currently_blocked,
    COALESCE(
      jsonb_object_agg(
        COALESCE(s.name, 'Unknown Staff'), 
        staff_count
      ) FILTER (WHERE s.name IS NOT NULL),
      '{}'::jsonb
    ) as blocked_by_staff,
    COALESCE(
      jsonb_object_agg(
        COALESCE(br.reason, 'No reason provided'), 
        reason_count
      ) FILTER (WHERE br.reason IS NOT NULL),
      '{}'::jsonb
    ) as blocked_by_reason,
    COALESCE(AVG(EXTRACT(EPOCH FROM (blocked_to_date - blocked_from_date)) / 86400), 0) as avg_block_duration
  FROM (
    SELECT 
      br.blocked_by_staff_id,
      br.reason,
      br.blocked_from_date,
      br.blocked_to_date,
      br.is_active,
      COUNT(*) as staff_count,
      COUNT(*) as reason_count
    FROM public.blocked_rooms br
    LEFT JOIN public.staff s ON br.blocked_by_staff_id = s.id
    WHERE 
      (p_from_date IS NULL OR br.blocked_date::date >= p_from_date)
      AND (p_to_date IS NULL OR br.blocked_date::date <= p_to_date)
    GROUP BY br.blocked_by_staff_id, br.reason, br.blocked_from_date, br.blocked_to_date, br.is_active
  ) br
  LEFT JOIN public.staff s ON br.blocked_by_staff_id = s.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_cancellation_stats(p_from_date date DEFAULT NULL::date, p_to_date date DEFAULT NULL::date)
 RETURNS TABLE(total_cancelled bigint, cancelled_by_reason jsonb, cancelled_by_staff jsonb, total_refund_amount numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_cancelled,
    COALESCE(
      jsonb_object_agg(
        COALESCE(cb.cancellation_reason, 'No reason provided'), 
        reason_count
      ) FILTER (WHERE cb.cancellation_reason IS NOT NULL),
      '{}'::jsonb
    ) as cancelled_by_reason,
    COALESCE(
      jsonb_object_agg(
        COALESCE(s.name, 'Unknown Staff'), 
        staff_count
      ) FILTER (WHERE s.name IS NOT NULL),
      '{}'::jsonb
    ) as cancelled_by_staff,
    COALESCE(SUM(cb.refund_amount), 0) as total_refund_amount
  FROM (
    SELECT 
      cb.cancellation_reason,
      cb.cancelled_by_staff_id,
      cb.refund_amount,
      COUNT(*) as reason_count,
      COUNT(*) as staff_count
    FROM public.cancelled_bookings cb
    LEFT JOIN public.staff s ON cb.cancelled_by_staff_id = s.id
    WHERE 
      (p_from_date IS NULL OR cb.cancel_date::date >= p_from_date)
      AND (p_to_date IS NULL OR cb.cancel_date::date <= p_to_date)
    GROUP BY cb.cancellation_reason, cb.cancelled_by_staff_id, cb.refund_amount
  ) cb
  LEFT JOIN public.staff s ON cb.cancelled_by_staff_id = s.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_checkout_statistics(start_date date DEFAULT (CURRENT_DATE - '7 days'::interval), end_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(total_notifications integer, approaching_count integer, overdue_count integer, grace_period_count integer, late_charges_count integer, total_late_fees numeric, average_grace_period_hours numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_notifications,
        COUNT(*) FILTER (WHERE cn.notification_type = 'approaching')::INTEGER as approaching_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'overdue')::INTEGER as overdue_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'grace_period')::INTEGER as grace_period_count,
        COUNT(*) FILTER (WHERE cn.notification_type = 'late_charges')::INTEGER as late_charges_count,
        COALESCE(SUM(lcc.late_checkout_fee), 0) as total_late_fees,
        COALESCE(
            AVG(
                EXTRACT(EPOCH FROM (gpt.grace_period_end - gpt.grace_period_start)) / 3600
            ), 0
        )::DECIMAL(5,2) as average_grace_period_hours
    FROM checkout_notifications cn
    LEFT JOIN late_checkout_charges lcc ON cn.booking_id = lcc.booking_id
    LEFT JOIN grace_period_tracker gpt ON cn.booking_id = gpt.booking_id
    WHERE cn.created_at::DATE BETWEEN start_date AND end_date;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_booking_room_values()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_rate numeric(10,2);
  v_nights integer;
BEGIN
  -- If room_rate not provided, snapshot from rooms.price
  IF NEW.room_rate IS NULL THEN
    SELECT price INTO v_rate FROM public.rooms WHERE id = NEW.room_id;
    NEW.room_rate := COALESCE(v_rate, 0);
  END IF;

  -- If expected_nights not provided, copy from bookings.planned_nights
  IF NEW.expected_nights IS NULL THEN
    SELECT planned_nights INTO v_nights FROM public.bookings WHERE id = NEW.booking_id;
    NEW.expected_nights := COALESCE(v_nights, 0);
  END IF;

  -- Compute room_total (allow override by explicit NEW.room_total if provided)
  IF NEW.room_total IS NULL THEN
    NEW.room_total := ROUND(COALESCE(NEW.room_rate,0) * COALESCE(NEW.expected_nights,0), 2);
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recompute_booking_payment_breakdown(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  a_cash numeric(10,2) := 0; a_card numeric(10,2) := 0; a_upi numeric(10,2) := 0; a_bank numeric(10,2) := 0;
  r_cash numeric(10,2) := 0; r_card numeric(10,2) := 0; r_upi numeric(10,2) := 0; r_bank numeric(10,2) := 0;
  total numeric(10,2) := 0;
  total_paid numeric(10,2) := 0;
  adj numeric(10,2) := 0;
BEGIN
  -- Get total and price adjustment from breakdown if present, otherwise fallback to bookings (for initial backfill)
  SELECT 
    COALESCE(bpb.total_amount, b.total_amount, 0),
    COALESCE(bpb.price_adjustment, b.price_adjustment, 0)
  INTO total, adj
  FROM public.bookings b
  LEFT JOIN public.booking_payment_breakdown bpb ON bpb.booking_id = b.id
  WHERE b.id = p_booking_id;

  WITH sums AS (
    SELECT LOWER(transaction_type) AS ttype, LOWER(payment_method) AS mthd, COALESCE(SUM(amount),0) AS amt
    FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND status = 'completed'
    GROUP BY 1,2
  )
  SELECT
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='cash' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='card' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='upi' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='advance' AND mthd='bank' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='cash' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='card' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='upi' THEN amt END),0),
    COALESCE(MAX(CASE WHEN ttype='receipt' AND mthd='bank' THEN amt END),0)
  INTO a_cash, a_card, a_upi, a_bank, r_cash, r_card, r_upi, r_bank
  FROM sums;

  total_paid := a_cash + a_card + a_upi + a_bank + r_cash + r_card + r_upi + r_bank;

  INSERT INTO public.booking_payment_breakdown AS bpb (
    booking_id, total_amount, price_adjustment, advance_cash, advance_card, advance_upi, advance_bank,
    receipt_cash, receipt_card, receipt_upi, receipt_bank, outstanding_amount, updated_at
  ) VALUES (
    p_booking_id, total, adj, a_cash, a_card, a_upi, a_bank, r_cash, r_card, r_upi, r_bank, GREATEST(total - total_paid, 0), now()
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    price_adjustment = EXCLUDED.price_adjustment,
    advance_cash = EXCLUDED.advance_cash,
    advance_card = EXCLUDED.advance_card,
    advance_upi = EXCLUDED.advance_upi,
    advance_bank = EXCLUDED.advance_bank,
    receipt_cash = EXCLUDED.receipt_cash,
    receipt_card = EXCLUDED.receipt_card,
    receipt_upi = EXCLUDED.receipt_upi,
    receipt_bank = EXCLUDED.receipt_bank,
    outstanding_amount = EXCLUDED.outstanding_amount,
    updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recompute_booking_room_totals(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sum numeric(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(room_total),0) INTO v_sum
  FROM public.booking_rooms WHERE booking_id = p_booking_id;

  UPDATE public.bookings SET room_total_amount = v_sum WHERE id = p_booking_id;

  INSERT INTO public.booking_payment_breakdown AS bpb (booking_id, total_amount, outstanding_amount)
  VALUES (p_booking_id, v_sum, GREATEST(v_sum - COALESCE((
    SELECT COALESCE(SUM(amount),0) FROM public.payment_transactions
    WHERE booking_id = p_booking_id AND status = 'completed' AND transaction_type IN ('advance','receipt')
  ),0), 0))
  ON CONFLICT (booking_id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    -- keep outstanding_amount consistent; it will be refreshed by other triggers too
    outstanding_amount = GREATEST(EXCLUDED.total_amount - COALESCE((
      SELECT COALESCE(SUM(amount),0) FROM public.payment_transactions
      WHERE booking_id = p_booking_id AND status = 'completed' AND transaction_type IN ('advance','receipt')
    ),0), 0),
    updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_arrival_type_from_ota()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If ota_company is not null, set arrival_type to 'OTA'
  IF NEW.ota_company IS NOT NULL AND TRIM(NEW.ota_company) != '' THEN
    NEW.arrival_type := 'OTA';
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_actual_checkin_from_booking_rooms()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the booking's actual_check_in to the earliest actual_check_in from booking_rooms
  UPDATE public.bookings
  SET actual_check_in = (
    SELECT MIN(br.actual_check_in)
    FROM public.booking_rooms br
    WHERE br.booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
      AND br.actual_check_in IS NOT NULL
  )
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_all_room_status()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.rooms 
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'occupied'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = rooms.id 
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'reserved'
    ELSE 'available'
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_room_status_from_booking_rooms()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update room status based on booking_rooms
  UPDATE public.rooms 
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
      AND br.room_status = 'checked_in'
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'occupied'
    WHEN EXISTS (
      SELECT 1 FROM public.booking_rooms br 
      WHERE br.room_id = COALESCE(NEW.room_id, OLD.room_id) 
      AND br.room_status = 'reserved'
      AND br.check_in_date <= CURRENT_DATE
      AND br.check_out_date >= CURRENT_DATE
    ) THEN 'reserved'
    ELSE 'available'
  END
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_bpb_after_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recompute_booking_payment_breakdown(NEW.booking_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.booking_id IS DISTINCT FROM OLD.booking_id THEN
      PERFORM public.recompute_booking_payment_breakdown(OLD.booking_id);
    END IF;
    PERFORM public.recompute_booking_payment_breakdown(NEW.booking_id);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_booking_payment_breakdown(OLD.booking_id);
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_recompute_booking_room_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.recompute_booking_room_totals(NEW.booking_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.booking_id IS DISTINCT FROM OLD.booking_id THEN
      PERFORM public.recompute_booking_room_totals(OLD.booking_id);
    END IF;
    PERFORM public.recompute_booking_room_totals(NEW.booking_id);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_booking_room_totals(OLD.booking_id);
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unblock_room(p_blocked_room_id uuid, p_unblocked_by_staff_id uuid, p_unblock_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_room_id uuid;
  v_blocked_room_exists boolean;
BEGIN
  -- Get room_id and check if blocked room exists
  SELECT room_id, EXISTS(
    SELECT 1 FROM public.blocked_rooms 
    WHERE id = p_blocked_room_id AND is_active = true
  ) INTO v_room_id, v_blocked_room_exists;
  
  IF NOT v_blocked_room_exists THEN
    RAISE EXCEPTION 'Blocked room record not found or already unblocked';
  END IF;
  
  -- Update blocked room record
  UPDATE public.blocked_rooms 
  SET 
    is_active = false,
    unblocked_date = now(),
    unblocked_by_staff_id = p_unblocked_by_staff_id,
    unblock_reason = p_unblock_reason,
    updated_at = now()
  WHERE id = p_blocked_room_id;
  
  -- Check if room has any other active blocks
  IF NOT EXISTS(
    SELECT 1 FROM public.blocked_rooms 
    WHERE room_id = v_room_id 
    AND is_active = true
    AND blocked_to_date >= CURRENT_DATE
  ) THEN
    -- No active blocks, update room status based on bookings
    UPDATE public.rooms 
    SET status = CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.booking_rooms br 
        WHERE br.room_id = v_room_id 
        AND br.room_status = 'checked_in'
        AND br.check_out_date >= CURRENT_DATE
      ) THEN 'occupied'
      WHEN EXISTS (
        SELECT 1 FROM public.booking_rooms br 
        WHERE br.room_id = v_room_id 
        AND br.room_status = 'reserved'
        AND br.check_in_date <= CURRENT_DATE
        AND br.check_out_date >= CURRENT_DATE
      ) THEN 'reserved'
      ELSE 'available'
    END
    WHERE id = v_room_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_blocked_rooms_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_cancelled_bookings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_guest_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update guest statistics when a booking is completed
    IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
        UPDATE guests 
        SET 
            total_stays = total_stays + 1,
            total_spent = total_spent + COALESCE(
              (SELECT total_amount FROM booking_payment_breakdown WHERE booking_id = NEW.id), 
              0
            ),
            last_stay_date = NEW.check_out
        WHERE id = NEW.guest_id;
        
        -- Insert visit record
        INSERT INTO guest_visits (
            guest_id, 
            booking_id, 
            check_in_date, 
            check_out_date, 
            room_type,
            total_amount
        ) VALUES (
            NEW.guest_id,
            NEW.id,
            NEW.check_in,
            NEW.check_out,
            (SELECT rt.name FROM rooms r 
             JOIN room_types rt ON r.room_type_id = rt.id 
             WHERE r.id = NEW.room_id),
            COALESCE(
              (SELECT total_amount FROM booking_payment_breakdown WHERE booking_id = NEW.id), 
              0
            )
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_loyalty_tier(guest_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_points INTEGER;
    new_tier VARCHAR(20);
BEGIN
    SELECT points_earned - points_redeemed - points_expired INTO total_points
    FROM guest_loyalty 
    WHERE guest_id = guest_uuid;
    
    -- Determine tier based on points
    IF total_points >= 1000 THEN
        new_tier := 'platinum';
    ELSIF total_points >= 500 THEN
        new_tier := 'gold';
    ELSIF total_points >= 200 THEN
        new_tier := 'silver';
    ELSE
        new_tier := 'bronze';
    END IF;
    
    -- Update tier if changed
    UPDATE guest_loyalty 
    SET tier = new_tier, tier_upgrade_date = CURRENT_DATE
    WHERE guest_id = guest_uuid AND tier != new_tier;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_room_types_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;


