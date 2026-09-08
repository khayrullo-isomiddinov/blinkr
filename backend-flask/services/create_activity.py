from datetime import datetime, timedelta, timezone

from lib.db import execute
class CreateActivity:
  def run(message, user_handle, ttl):
    model = {
      'errors': None,
      'data': None
    }

    now = datetime.now(timezone.utc).astimezone()

    if (ttl == '30-days'):
      ttl_offset = timedelta(days=30) 
    elif (ttl == '7-days'):
      ttl_offset = timedelta(days=7) 
    elif (ttl == '3-days'):
      ttl_offset = timedelta(days=3) 
    elif (ttl == '1-day'):
      ttl_offset = timedelta(days=1) 
    elif (ttl == '12-hours'):
      ttl_offset = timedelta(hours=12) 
    elif (ttl == '3-hours'):
      ttl_offset = timedelta(hours=3) 
    elif (ttl == '1-hour'):
      ttl_offset = timedelta(hours=1) 
    else:
      model['errors'] = ['ttl_blank']

    if user_handle == None or len(user_handle) < 1:
      model['errors'] = ['user_handle_blank']

    if message == None or len(message) < 1:
      model['errors'] = ['message_blank'] 
    elif len(message) > 280:
      model['errors'] = ['message_exceed_max_chars'] 

    if model['errors']:
      model['data'] = {
        'handle':  user_handle,
        'message': message
      }
    else:
      row = execute(
        """
        INSERT INTO public.activities (user_uuid, message, expires_at)
        SELECT uuid, %s, %s FROM public.users WHERE handle = %s
        RETURNING uuid, message, created_at, expires_at
        """,
        (message, now + ttl_offset, user_handle)
      )
      if row is None:
        model['errors'] = ['user_handle_not_found']
        model['data'] = {
          'handle':  user_handle,
          'message': message
        }
      else:
        model['data'] = {
          'uuid': row['uuid'],
          'display_name': 'Andrew Brown',
          'handle':  user_handle,
          'message': row['message'],
          'created_at': row['created_at'].isoformat(),
          'expires_at': row['expires_at'].isoformat()
        }
    return model