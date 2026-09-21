import boto3

from events.publisher import EventPublisher, EventPublishError


class AWSEventPublisher(EventPublisher):
  # Real transport for workout domain events -- publishes to the SQS queue
  # named by `queue_url`. Nothing outside this file (and EventPublishError,
  # which is part of the abstraction, not AWS-specific) knows about SQS or
  # boto3; the application layer only ever depends on EventPublisher.
  def __init__(self, queue_url, sqs_client=None):
    self.queue_url = queue_url
    self._sqs = sqs_client if sqs_client is not None else boto3.client('sqs')

  def publish(self, event):
    try:
      self._sqs.send_message(QueueUrl=self.queue_url, MessageBody=event.to_json())
    except Exception as e:
      raise EventPublishError(
        f'failed to publish {event.event_type} ({event.event_id}) to SQS'
      ) from e
