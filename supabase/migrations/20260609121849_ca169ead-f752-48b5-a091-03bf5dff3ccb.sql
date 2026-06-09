
REVOKE EXECUTE ON FUNCTION public.toggle_favorite(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_follow(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_comment(uuid,uuid,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_comment(uuid,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.soft_delete_comment(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_hide_comment(uuid,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_campaign_update(uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.creator_edit_update(uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.report_target(uuid,uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_follow_on_contribution() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_comment_thread_depth() FROM PUBLIC;
