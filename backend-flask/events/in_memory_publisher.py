from events.publisher import EventPublisher


class InMemoryEventPublisher(EventPublisher):
  # Local/test implementation -- keeps published events in a list instead of
  # sending them anywhere, so local development and tests can inspect what
  # would have been published.
  def __init__(self):
    self.published_events = []

  def publish(self, event):
    self.published_events.append(event)
