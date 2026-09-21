from abc import ABC, abstractmethod


class EventPublishError(Exception):
  # Raised by an EventPublisher implementation when its transport didn't
  # accept the event. Part of the abstraction itself (not AWS-specific) so
  # callers have exactly one exception type to handle regardless of which
  # implementation is active -- never swallow this silently.
  pass


class EventPublisher(ABC):
  # Application code (and the AWS-backed implementation that will replace
  # InMemoryEventPublisher later) depends on this interface, never on a
  # specific transport.
  @abstractmethod
  def publish(self, event):
    raise NotImplementedError
