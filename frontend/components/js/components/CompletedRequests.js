export default {
    template: `
    <div>
        <nav class="navbar navbar-dark bg-dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="/#/professional-dashboard">Professional Dashboard</a>
                <div>
                    <router-link to="/assigned-requests" class="nav-link d-inline text-white">Accepted Requests</router-link>
                    <router-link to="/completed-requests" class="nav-link d-inline text-white">request history</router-link>
                    <router-link to="/professional-profile" class="nav-link d-inline text-white">My Profile</router-link>
                    <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                </div>
            </div>
        </nav>

        <div class="container mt-5">
            <h1 class="text-center">Welcome, {{ professionalName }}</h1>

            <h3 class="mt-4">Completed Service Requests</h3>
            <table class="table table-bordered mt-3">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Service Name</th>
                        <th>Customer Name</th>
                        <th>Booking Date</th>
                        <th>Booking Time</th>
                        <th>Status</th>
                        <th>Rating</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="request in completedRequests" :key="request.id">
                        <td>{{ request.id }}</td>
                        <td>{{ request.service_name }}</td>
                        <td>{{ request.customer_name }}</td>
                        <td>{{ request.booking_date }}</td>
                        <td>{{ request.booking_time }}</td>
                        <td><span class="badge bg-success">{{ request.status }}</span></td>
                        <td>
                            <span v-if="request.rating !== null">{{ request.rating }}/5</span>
                            <span v-else>No Rating</span>
                        </td>
                        <td>{{ request.remarks }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    `,
    data() {
        return {
            professionalName: "",
            completedRequests: []
        };
    },
    methods: {
        async fetchCompletedRequests() {
            try {
                const response = await axios.get('/api/completed_requests', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.professionalName = response.data.professional_name;
                this.completedRequests = response.data.completed_requests;
            } catch (error) {
                console.error("Error fetching completed requests:", error);
            }
        },
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }
    },
    mounted() {
        this.fetchCompletedRequests();
    }
};
