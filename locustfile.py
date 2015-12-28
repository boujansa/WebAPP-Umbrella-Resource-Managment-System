from locust import HttpLocust, TaskSet, task
"""
for i in range(10):
    client.get("/blog?id=%i" % i, name="/blog?id=[id]")


"""
class UserBehavior(TaskSet):
    def on_start(self):
        """ on_start is called when a Locust start before any task is scheduled """
        self.login()


        for i in range(10):
        	self.client.post("/createLab",{"labname": "TestLab%i" % i,"department": "Engineering","specialization": "General Purposes","address": "1234","description": "load testing"})
        	self.client.get("/approveThisLab?specificLab=TestLab%i" % i)
   	

    def login(self):
        self.client.post("/login", {"email":"sayf@gmail.com", "password":"1"})

    @task(2)
    def index(self):
        self.client.get("/")

    @task(1)
    def profile(self):
        response = self.client.get("/profile")

    @task(2)
    def listLabs(self):
    	self.client.get("/listLabs")

    @task(2)
    def viewLab(self):
    	for i in range(10):
    		self.client.get("/listThisLab?specificLab=TestLab%i" % i)




        '''print ("Response status code ", response.status_code)
        print ("Response content ",response.content)

   	@task(2)
   	def createLab(self):
   		self.client.post("/createLab",{
   			"labname": "TestLab",
   			"department": "Engineering",
   			"specialization": "General Purposes",
   			"address": "1234",
   			"description": "load testing",
   			})'''

class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    min_wait=5000
    max_wait=9000
    host = "http://localhost:3000"