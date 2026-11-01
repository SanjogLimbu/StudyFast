from rq.cron import CronScheduler

from job_queue import redis_connection
from worker.tasks import delete_old_tts

##

if (__name__ == "__main__"):
    scheduler = CronScheduler(connection=redis_connection)
    scheduler.register(delete_old_tts, "documents", cron="0 0 * * *")
    scheduler.start()

